import 'primeicons/primeicons.css';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import PrimeVue from 'primevue/config';
import { createApp } from 'vue';
import App from '@/App.vue';
import { i18n, initializeLocale } from '@/i18n';
import { env } from '@/lib/env';
import { AppPreset } from '@/lib/theme';
import router from '@/router';
import '@/styles/main.css';

await initializeLocale();

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
  .use(ToastService)
  .use(ConfirmationService)
  .use(i18n)
  .use(router)
  .mount('#app');
