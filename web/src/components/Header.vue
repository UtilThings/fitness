<script setup lang="ts">
import { ref } from 'vue';
import { navigation } from '@/lib/navigation';
import { useLang } from '@/lib/use-lang';

defineOptions({ name: 'SiteHeader' });
defineProps<{ currentPath: string; logoSrc: string }>();

const { lang, setLang, t } = useLang();
const menuOpen = ref(false);
const languages = ['en', 'es'] as const;

function isCurrent(current: string, href: string) {
  return current.replace(/\/$/, '') === href;
}
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur"
  >
    <div
      class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5"
    >
      <a
        href="/"
        aria-label="JQ Fitness — home"
        class="flex items-center gap-2.5"
      >
        <img :src="logoSrc" alt="JQ Fitness logo" class="h-10 w-auto" />
        <span class="font-display text-2xl uppercase tracking-wide"
          >JQ <span class="text-primary">Fitness</span></span
        >
      </a>
      <nav aria-label="Main menu" class="hidden items-center gap-5 xl:flex">
        <a
          v-for="{ key, href } in navigation"
          :key="key"
          :href="href"
          :aria-current="isCurrent(currentPath, href) ? 'page' : undefined"
          class="text-sm font-semibold"
          :class="
            isCurrent(currentPath, href)
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          "
          >{{ t(key) }}</a
        >
      </nav>
      <div class="flex items-center gap-3">
        <div
          class="flex rounded-full border border-border p-0.5 text-xs font-bold"
        >
          <button
            v-for="language in languages"
            :key="language"
            type="button"
            :aria-pressed="lang === language"
            class="rounded-full px-2.5 py-1 uppercase"
            :class="
              lang === language
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground'
            "
            @click="setLang(language)"
          >
            {{ language }}
          </button>
        </div>
        <a
          href="/schedule"
          class="btn btn-primary hidden !px-4 !py-2 sm:inline-flex"
          >{{ t('book') }}</a
        >
        <button
          type="button"
          class="xl:hidden"
          aria-label="Menu"
          :aria-expanded="menuOpen"
          aria-controls="mobile-menu"
          @click="menuOpen = !menuOpen"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path v-if="menuOpen" d="m18 6-12 12M6 6l12 12" />
            <path v-else d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
    <nav
      v-if="menuOpen"
      id="mobile-menu"
      aria-label="Mobile menu"
      class="flex flex-col gap-1 border-t border-border px-5 py-4 xl:hidden"
    >
      <a
        v-for="{ key, href } in navigation"
        :key="key"
        :href="href"
        :aria-current="isCurrent(currentPath, href) ? 'page' : undefined"
        class="py-2 font-display text-xl uppercase"
        @click="menuOpen = false"
        >{{ t(key) }}</a
      >
    </nav>
  </header>
</template>
