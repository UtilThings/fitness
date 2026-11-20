// @ts-check
import { fileURLToPath } from 'node:url';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

export default defineConfig({
  integrations: [
    vue(),
    {
      name: 'jq-fitness-site',
      hooks: {
        'astro:config:setup': ({ command, config, updateConfig }) => {
          const isDevelopment = command === 'dev';
          const mode =
            config.vite.mode ?? (isDevelopment ? 'development' : 'production');
          const { PUBLIC_SITE_URL } = loadEnv(
            mode,
            fileURLToPath(config.root),
            'PUBLIC_SITE_URL',
          );
          const site =
            PUBLIC_SITE_URL?.trim() ||
            (isDevelopment ? 'http://localhost:4321' : undefined);

          if (site && URL.canParse(site)) {
            updateConfig({ site });
          }
        },
      },
    },
  ],
  vite: { plugins: [tailwindcss()] },
});
