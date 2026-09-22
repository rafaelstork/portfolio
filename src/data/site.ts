export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const local = (path = '') => `${base}/${path.replace(/^\//, '')}`;
export const instagram = 'https://www.instagram.com/rafaelstork.dzn/';
export const whatsapp = 'https://wa.me/5548984648376?text=Ol%C3%A1%2C%20Rafael!%20Gostaria%20de%20conversar%20sobre%20um%20projeto.';
