const REPO="astalmn/devahmad-blog";
const OWNER="astalmn";

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Cache-Control":"no-store"
    }
  });
}

function getCookie(request,name){
  const value=(request.headers.get("Cookie")||"")
    .split(";")
    .map(v=>v.trim())
    .find(v=>v.startsWith(name+"="));
  return value?value.slice(name.length+1):null;
}

function fromBase64Url(value){
  const normalized=value.replace(/-/g,"+").replace(/_/g,"/");
  const decoded=atob(normalized);
  return Uint8Array.from(decoded,c=>c.charCodeAt(0));
}

async function getSession(request,secret){
  const cookie=getCookie(request,"editor_session");
  if(!cookie||!secret)return null;
  try{
    const [iv,ciphertext]=cookie.split(".");
    if(!iv||!ciphertext)return null;
    const material=new TextEncoder().encode("DevAhmad editor session v1:"+secret);
    const digest=await crypto.subtle.digest("SHA-256",material);
    const key=await crypto.subtle.importKey("raw",digest,"AES-GCM",false,["decrypt"]);
    const plain=await crypto.subtle.decrypt(
      {name:"AES-GCM",iv:fromBase64Url(iv)},
      key,
      fromBase64Url(ciphertext)
    );
    const session=JSON.parse(new TextDecoder().decode(plain));
    if(typeof session.token!=="string"||!Number.isFinite(session.expires)||Date.now()>=session.expires)return null;
    return session;
  }catch{
    return null;
  }
}

async function verifyEditor(request,env){
  const session=await getSession(request,env.GITHUB_CLIENT_SECRET);
  if(!session)return {error:json({error:"unauthorized"},401)};

  const headers={
    Accept:"application/vnd.github+json",
    Authorization:"Bearer "+session.token,
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"DevAhmad-Editor"
  };

  try{
    const userResponse=await fetch("https://api.github.com/user",{headers});
    if(!userResponse.ok)return {error:json({error:"Unable to verify GitHub account"},502)};
    const user=await userResponse.json();
    if(!user.login||user.login.toLowerCase()!==OWNER)return {error:json({error:"forbidden"},403)};

    const repoResponse=await fetch("https://api.github.com/repos/"+REPO,{headers});
    if(!repoResponse.ok)return {error:json({error:"Unable to verify repository access"},502)};
    const repo=await repoResponse.json();
    if(!repo.permissions?.push)return {error:json({error:"forbidden"},403)};

    return {session,user};
  }catch{
    return {error:json({error:"Unable to verify GitHub access"},502)};
  }
}

function validMutationOrigin(request){
  const origin=request.headers.get("Origin");
  return Boolean(origin&&origin===new URL(request.url).origin);
}

export async function onRequest({request,env}){
  const method=request.method.toUpperCase();

  if((method==="POST"||method==="DELETE")&&!validMutationOrigin(request)){
    return json({error:"Invalid request origin"},403);
  }

  const verified=await verifyEditor(request,env);
  if(verified.error)return verified.error;

  try{
    if(method==="GET"){
      const {results}=await env.COMMENTS_DB
        .prepare(`
          SELECT id,page_id,article_title,name,email,content,status,created_at
          FROM comments
          ORDER BY created_at DESC
        `)
        .all();
      return json({comments:results});
    }

    if(method==="POST"){
      if(!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")){
        return json({error:"Invalid content type"},415);
      }

      let body;
      try{body=await request.json()}catch{return json({error:"Invalid JSON"},400)}
      const id=Number(body.id);
      const status=body.status;
      if(!Number.isInteger(id)||id<=0||!["approved","rejected","pending"].includes(status)){
        return json({error:"invalid"},400);
      }

      await env.COMMENTS_DB
        .prepare("UPDATE comments SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind(status,id)
        .run();
      return json({success:true});
    }

    if(method==="DELETE"){
      const id=Number(new URL(request.url).searchParams.get("id"));
      if(!Number.isInteger(id)||id<=0)return json({error:"missing id"},400);

      await env.COMMENTS_DB
        .prepare("DELETE FROM comments WHERE id=?")
        .bind(id)
        .run();
      return json({success:true});
    }

    return json({error:"method"},405);
  }catch{
    return json({error:"server"},500);
  }
}
