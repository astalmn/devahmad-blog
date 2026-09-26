const REPO = "astalmn/devahmad-blog";
const SITE = "https://devahmad-blog.pages.dev";
const MAX_BYTES = 2 * 1024 * 1024;
function json(data, status=200) { return new Response(JSON.stringify(data), {status, headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}}); }
function b64url(v) { const s=v.replace(/-/g,"+").replace(/_/g,"/"); return Uint8Array.from(atob(s), c=>c.charCodeAt(0)); }
async function session(request, secret) {
  const cookie=(request.headers.get("Cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("editor_session="))?.slice(15);
  if(!cookie || !secret) return null;
  try {
    const parts=cookie.split("."); if(parts.length!==2) return null;
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("DevAhmad editor session v1:"+secret));
    const key=await crypto.subtle.importKey("raw",digest,"AES-GCM",false,["decrypt"]);
    const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64url(parts[0])},key,b64url(parts[1]));
    const data=JSON.parse(new TextDecoder().decode(plain));
    return typeof data.token==="string" && Number.isFinite(data.expires) && Date.now()<data.expires ? data : null;
  } catch { return null; }
}
function detectedType(b) {
  if(b.length>=3 && b[0]===255 && b[1]===216 && b[2]===255) return {ext:"jpg",mime:"image/jpeg"};
  if(b.length>=8 && [137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x)) return {ext:"png",mime:"image/png"};
  if(b.length>=12 && String.fromCharCode(...b.slice(0,4))==="RIFF" && String.fromCharCode(...b.slice(8,12))==="WEBP") return {ext:"webp",mime:"image/webp"};
  return null;
}
function base64(bytes) { let s=""; for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s); }
export async function onRequestPost({request,env}) {
  if(request.headers.get("Origin")!==SITE) return json({error:"المصدر غير مسموح"},403);
  if(!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return json({error:"صيغة الطلب غير صالحة"},415);
  if(Number(request.headers.get("Content-Length")||0)>3_000_000) return json({error:"الصورة كبيرة جدًا"},413);
  const auth=await session(request,env.GITHUB_CLIENT_SECRET);
  if(!auth) return json({error:"انتهت جلسة الدخول"},401);
  let payload;try{payload=await request.json()}catch{return json({error:"بيانات غير صالحة"},400)}
  if(typeof payload.image!=="string" || payload.image.length>2_900_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.image))return json({error:"صورة غير صالحة أو كبيرة"},400);
  let bytes;try{bytes=Uint8Array.from(atob(payload.image),c=>c.charCodeAt(0))}catch{return json({error:"ترميز الصورة غير صالح"},400)}
  if(bytes.length===0 || bytes.length>MAX_BYTES)return json({error:"الحد الأقصى للصورة 2 ميغابايت"},413);
  const type=detectedType(bytes);if(!type)return json({error:"المسموح JPG وPNG وWebP فقط"},415);
  const headers={"Accept":"application/vnd.github+json","Authorization":"Bearer "+auth.token,"X-GitHub-Api-Version":"2022-11-28","User-Agent":"DevAhmad-Editor"};
  try {
    const permissions=await fetch("https://api.github.com/repos/"+REPO,{headers});
    if(!permissions.ok)return json({error:"تعذر التحقق من صلاحيات GitHub"},502);
    const repo=await permissions.json();if(!repo.permissions?.push)return json({error:"لا توجد صلاحية للرفع"},403);
    const filename=crypto.randomUUID()+"."+type.ext;
    const path="public/uploads/"+filename;
    const result=await fetch("https://api.github.com/repos/"+REPO+"/contents/"+path,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({message:"Upload image: "+filename,content:base64(bytes),branch:"main"})});
    if(!result.ok)return json({error:"فشل رفع الصورة إلى GitHub ("+result.status+")"},502);
    return json({success:true,url:"/uploads/"+filename,path,mime:type.mime});
  } catch {return json({error:"تعذر الاتصال بـ GitHub"},502)}
                                                                  }
      
