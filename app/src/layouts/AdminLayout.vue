<script setup lang="ts">
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import Sidebar from 'primevue/sidebar';
import SidebarAside from 'primevue/sidebaraside';
import SidebarBackdrop from 'primevue/sidebarbackdrop';
import SidebarContent from 'primevue/sidebarcontent';
import SidebarFooter from 'primevue/sidebarfooter';
import SidebarGroup from 'primevue/sidebargroup';
import SidebarGroupContent from 'primevue/sidebargroupcontent';
import SidebarGroupLabel from 'primevue/sidebargrouplabel';
import SidebarHeader from 'primevue/sidebarheader';
import SidebarLayout from 'primevue/sidebarlayout';
import SidebarMain from 'primevue/sidebarmain';
import SidebarMenu from 'primevue/sidebarmenu';
import SidebarMenuBadge from 'primevue/sidebarmenubadge';
import SidebarMenuButton from 'primevue/sidebarmenubutton';
import SidebarMenuItem from 'primevue/sidebarmenuitem';
import SidebarPanel from 'primevue/sidebarpanel';
import SidebarSpacer from 'primevue/sidebarspacer';
import SidebarTrigger from 'primevue/sidebartrigger';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import logo from '@/assets/jq-logo.png';
import { useAuth } from '@/composables/useAuth';
import { useMediaQuery } from '@/composables/useMediaQuery';
import { adminNav } from '@/layouts/admin-nav';

const route = useRoute();
const router = useRouter();
const { user, avatarUrl, logout } = useAuth();
const avatarFailed = ref(false);
watch(avatarUrl, () => (avatarFailed.value = false));

const isMobile = useMediaQuery('(max-width: 767px)');
const open = ref(!isMobile.value);

// Al cambiar de modo, escritorio abre la barra y móvil la cierra.
watch(isMobile, (mobile) => {
  open.value = !mobile;
});
// En móvil, navegar cierra el panel superpuesto.
watch(
  () => route.fullPath,
  () => {
    if (isMobile.value) open.value = false;
  },
);

const displayName = computed(
  () => user.value?.name || user.value?.email?.split('@')[0] || 'Usuario',
);
const initials = computed(() => displayName.value.slice(0, 2).toUpperCase());

const isActive = (to: string) =>
  to === '/' ? route.path === '/' : route.path.startsWith(to);

const menu = ref<InstanceType<typeof Menu> | null>(null);
const userMenu = computed(() => [
  { label: user.value?.email ?? '', disabled: true },
  { separator: true },
  { label: 'Ajustes', icon: 'pi pi-cog' },
  { label: 'Notificaciones', icon: 'pi pi-bell' },
  { separator: true },
  {
    label: 'Cerrar sesión',
    icon: 'pi pi-sign-out',
    command: async () => {
      logout();
      await router.push({ name: 'login' });
    },
  },
]);
</script>

<template>
  <SidebarLayout>
    <Sidebar
      id="admin-sidebar"
      v-model:open="open"
      variant="floating"
      :collapsible="isMobile ? 'offcanvas' : 'icon'"
      :overlay="isMobile"
    >
      <SidebarSpacer />
      <SidebarAside>
        <SidebarPanel>
          <SidebarHeader>
            <div class="flex items-center gap-2 px-2 py-1">
              <img :src="logo" alt="" class="h-7 w-auto shrink-0" />
              <span class="truncate font-semibold">JQ Fitness</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup v-for="group in adminNav" :key="group.label">
              <SidebarGroupLabel>{{ group.label }}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem v-for="item in group.items" :key="item.to">
                    <SidebarMenuButton
                      :as="RouterLink"
                      :to="item.to"
                      :is-active="isActive(item.to)"
                    >
                      <i :class="item.icon" aria-hidden="true" />
                      <span>{{ item.label }}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge v-if="item.badge">
                      {{ item.badge }}
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-surface-100 dark:hover:bg-surface-800"
              aria-haspopup="true"
              aria-controls="user-menu"
              @click="menu?.toggle($event)"
            >
              <Avatar
                v-if="avatarUrl && !avatarFailed"
                :image="avatarUrl"
                shape="circle"
                class="shrink-0"
                @error="avatarFailed = true"
              />
              <Avatar
                v-else
                :label="initials"
                shape="circle"
                class="shrink-0"
              />
              <span
                class="min-w-0 flex-1 truncate text-sm in-data-[collapsible=icon]:hidden"
              >
                {{ displayName }}
              </span>
              <i
                class="pi pi-chevron-down text-xs text-surface-400 in-data-[collapsible=icon]:hidden"
              />
            </button>
            <Menu id="user-menu" ref="menu" :model="userMenu" popup />
          </SidebarFooter>
        </SidebarPanel>
      </SidebarAside>
    </Sidebar>
    <SidebarBackdrop v-if="isMobile" />
    <SidebarMain class="min-w-0 flex-1">
      <header
        class="flex items-center gap-3 border-b border-surface-200 px-4 py-3 dark:border-surface-800"
      >
        <SidebarTrigger
          icon="pi pi-bars"
          severity="secondary"
          variant="text"
          aria-label="Alternar barra lateral"
        />
        <span class="text-sm font-medium">{{ route.meta.title }}</span>
      </header>
      <div class="p-4">
        <RouterView />
      </div>
    </SidebarMain>
  </SidebarLayout>
</template>
