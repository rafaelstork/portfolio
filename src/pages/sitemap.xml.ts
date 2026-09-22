import cases from '../data/cases.json';
export const GET=({site}: {site:URL})=>{
 const base=import.meta.env.BASE_URL.replace(/\/$/,'');
 const paths=['/','/sobre/','/trabalhos/','/politica-de-privacidade/',...cases.map(p=>`/trabalhos/${p.slug}/`)];
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>`<url><loc>${new URL(base+path,site).href}</loc></url>`).join('')+'</urlset>';
 return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
};
