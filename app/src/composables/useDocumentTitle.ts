import { watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { translateKey } from '@/i18n';

export function useDocumentTitle(brandName: () => string, active = () => true) {
  const route = useRoute();

  watchEffect(() => {
    if (!active()) return;
    const title = route.meta.title;
    const name = brandName();
    document.title = title ? `${translateKey(title)} · ${name}` : name;
  });
}
