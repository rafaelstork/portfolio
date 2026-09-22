import { defineConfig } from 'astro/config';

// GitHub Actions supplies the actual Pages URL and repository path.
export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://rafaelstork.github.io',
  base: process.env.BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/portfolio' : '/'),
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});

