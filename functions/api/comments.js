const MAX_NAME=80,MAX_EMAIL=160,MAX_TEXT=2000;
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function clean(v,max){return typeof v==="string"?v.trim().replace(/[<>]/g,"").slice(0,max):""}
function validOrigin(r){return r.headers.get("Origin")==="https://devahmad-blog.pages.dev"}
export async function onRequest({request,env}){try{if(request.method==="GET"){const page=new URL(request.url).searchParams.get("page");if(!page)return json({error:"missing page"},400);const {results}=await env.COMMENTS_DB.prepare("SELECT id,name,content,created_at FROM comments WHERE page_id=? AND status='approved' ORDER BY created_at DESC").bind(page).all();return json({comments:results})}
if(request.method==="POST"){if(!validOrigin(request))return json({error:"forbidden"},403);let body;try{body=await request.json()}catch{return json({error:"invalid json"},400)}
const page=clean(body.page_id,200),title=clean(body.article_title,200),name=clean(body.name,MAX_NAME),email=clean(body.email,MAX_EMAIL),content=clean(body.content,MAX_TEXT);
if(!page||!title||!name||!content)return json({error:"required fields"},400);
if(content.length<3)return json({error:"comment too short"},400);
await env.COMMENTS_DB.prepare("INSERT INTO comments(page_id,article_title,name,email,content,status) VALUES(?,?,?,?,?,'pending')").bind(page,title,name,email,content).run();
return json({success:true,message:"تم إرسال التعليق للمراجعة"})}
return json({error:"method not allowed"},405)}catch(e){return json({error:"server error"},500)}}
