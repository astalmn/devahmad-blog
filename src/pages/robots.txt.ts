export function GET({site}:any){return new Response(`User-agent: *
Allow: /
Sitemap: ${new URL('/sitemap-index.xml',site)}
`,{headers:{'Content-Type':'text/plain'}})}
