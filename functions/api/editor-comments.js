const REPO="astalmn/devahmad-blog";
function json(d,s=200){return new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function cookie(r,n){const c=r.headers.get("Cookie")||"";const x=c.split(";").map(v=>v.trim()).find(v=>v.startsWith(n+"="));return x?x.slice(n.length+1):null}
async function auth(r,e){const c=cookie(r,"editor_session");if(!c)return false;try{return true}catch{return false}}
export async function onRequest({request,env}){if(!await auth(request,env))return json({error:"unauthorized"},401);try{
if(request.method==="GET"){const {results}=await env.COMMENTS_DB.prepare("SELECT * FROM comments ORDER BY created_at DESC").all();return json({comments:results})}
if(request.method==="POST"){const b=await request.json();const id=Number(b.id),status=b.status;if(!id||!["approved","rejected","pending"].includes(status))return json({error:"invalid"},400);await env.COMMENTS_DB.prepare("UPDATE comments SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,id).run();return json({success:true})}
if(request.method==="DELETE"){const id=Number(new URL(request.url).searchParams.get("id"));if(!id)return json({error:"missing id"},400);await env.COMMENTS_DB.prepare("DELETE FROM comments WHERE id=?").bind(id).run();return json({success:true})}
return json({error:"method"},405)}catch{return json({error:"server"},500)}}
