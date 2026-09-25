import { getCollection } from 'astro:content';
export const site = { name: 'DevAhmad', email: 'astalahmadmn@gmail.com', github: 'https://github.com/astalmn', whatsapp: 'https://wa.me/972567202165' };
export const labels = {home:'الرئيسية',blog:'المدونة',projects:'المشاريع',about:'عني',resources:'المصادر',contact:'تواصل'};
export async function posts(){return (await getCollection('blog',({data})=>!data.draft && data.lang==='ar')).sort((a,b)=>b.data.date.getTime()-a.data.date.getTime());}
export const articleUrl=(id:string)=>`/blog/${id}/`;
