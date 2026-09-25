import rss from '@astrojs/rss';import {posts,articleUrl} from '../lib/site';
export async function GET(context:any){const all=await posts();return rss({title:'DevAhmad — المدونة العربية',description:'مقالات في البرمجة والذكاء الاصطناعي',site:context.site,items:all.map(p=>({title:p.data.title,description:p.data.description,pubDate:p.data.date,link:articleUrl(p.id)}))})}
