import 'primeicons/primeicons.css';
import PrimeVue from 'primevue/config';
import { createApp } from 'vue';
import App from '@/App.vue';
import { env } from '@/lib/env';
import { AppPreset } from '@/lib/theme';
import router from '@/router';
import '@/styles/main.css';

createApp(App)
  .use(PrimeVue, {
    license: env.primevueLicense,
    theme: {
      preset: AppPreset,
      options: {
        darkModeSelector: '.app-dark',
        cssLayer: { name: 'primevue', order: 'theme, base, primevue' },
      },
    },
  })
  .use(router)
  .mount('#app');
