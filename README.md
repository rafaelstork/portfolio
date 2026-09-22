# Rafael Stork — portfólio

Site estático Astro com GSAP, Three.js, Lenis e Swup.

## Desenvolvimento

```sh
npm ci
npm run dev
```

## Publicação

URL: https://rafaelstork.github.io/portfolio/

O push em `main` executa o workflow GitHub Pages. `npm run build` gera `dist/`.
O caminho público é `/portfolio/`; em desenvolvimento, a raiz local é `/`.

## Adicionar trabalhos

Edite `src/data/cases.json` e coloque as imagens em `public/images/`.
Cada case gera uma página, uma apresentação e uma entrada no sitemap. O campo `featured` controla a seleção inicial de projetos.

## Organização local

A pasta principal contém apenas `⬜ SITE ATUAL` (este projeto) e `⬜ BACKUP`.
Backups: `Rafael Stork (VX.X.X) yyyy-mm-dd hh-mm.zip`. Dependências e caches são reinstaláveis e não entram nos ZIPs.

## Indexação

As rotas `sitemap.xml`, `robots.txt` e `llm.txt` são geradas no build com URLs absolutas.
Por ser um projeto do GitHub Pages, robots.txt fica em `/portfolio/robots.txt`. O arquivo que controla todo o host, se necessário, deve existir na raiz de `rafaelstork.github.io`, em outro repositório. O sitemap deste projeto pode ser enviado ao Search Console independentemente disso.
