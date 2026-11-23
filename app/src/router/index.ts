import {
  createRouter,
  createWebHistory,
  type LocationQueryValue,
  type Router,
} from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import AdminLayout from '@/layouts/AdminLayout.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import { PERMISSIONS } from '@/lib/permissions';
import type { Role } from '@/types/pb';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    title?: string;
    roles?: Role[];
    roleDeniedRedirect?: string;
  }
}

/** Acepta solo rutas internas (evita redirecciones abiertas). */
export function safeRedirect(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string {
  const target = Array.isArray(value) ? value[0] : value;
  if (
    typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//') &&
    !target.includes('\\')
  ) {
    return target;
  }
  return '/';
}

const authRoutes = ['login', 'forgot-password'];

export function installGuard(router: Router) {
  router.beforeEach((to) => {
    const { isAuthenticated, role } = useAuth();
    const requiresAuth = to.matched.some(
      ({ meta }) => meta.requiresAuth || meta.roles,
    );
    if (requiresAuth && !isAuthenticated.value) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
    const denied = to.matched.find(
      ({ meta }) =>
        meta.roles && (!role.value || !meta.roles.includes(role.value)),
    );
    if (denied) {
      return denied.meta.roleDeniedRedirect
        ? { path: denied.meta.roleDeniedRedirect }
        : { name: 'forbidden' };
    }
    if (
      typeof to.name === 'string' &&
      authRoutes.includes(to.name) &&
      isAuthenticated.value
    ) {
      return { path: '/' };
    }
    return true;
  });
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/admin/DashboardView.vue'),
          meta: { title: 'Dashboard' },
        },
        {
          path: 'audit',
          name: 'audit',
          component: () => import('@/views/admin/AuditView.vue'),
          meta: {
            title: 'Auditoría',
            requiresAuth: true,
            roles: ['owner'],
            roleDeniedRedirect: '/',
          },
        },
        {
          path: 'clients',
          name: 'clients',
          component: () => import('@/views/admin/ClientsView.vue'),
          meta: { title: 'Clientes' },
        },
        {
          path: 'clients/:id',
          name: 'client-detail',
          component: () => import('@/views/admin/ClientDetailView.vue'),
          meta: { title: 'Cliente' },
        },
        {
          path: 'memberships',
          name: 'memberships',
          component: () => import('@/views/admin/MembershipsView.vue'),
          meta: { title: 'Suscripciones', requiresAuth: true },
        },
        {
          path: 'payments',
          name: 'payments',
          component: () => import('@/views/admin/PaymentsView.vue'),
          meta: { title: 'Pagos', roles: [...PERMISSIONS['payments.manage']] },
        },
        {
          path: 'team',
          name: 'team',
          component: () => import('@/views/admin/TeamView.vue'),
          meta: { title: 'Equipo' },
        },
        {
          path: 'team/:id',
          name: 'team-member',
          component: () => import('@/views/admin/TeamMemberView.vue'),
          meta: { title: 'Ficha del equipo' },
        },
        {
          path: 'agenda',
          name: 'coach-agenda',
          component: () => import('@/views/admin/CoachAgendaView.vue'),
          meta: { title: 'Agenda por coach', requiresAuth: true },
        },
        {
          path: 'agenda/disponibilidad',
          name: 'coach-availability',
          component: () => import('@/views/admin/CoachAvailabilityView.vue'),
          meta: { title: 'Disponibilidad semanal', requiresAuth: true },
        },
        {
          path: 'classes',
          name: 'classes',
          component: () => import('@/views/admin/ClassesView.vue'),
          meta: { title: 'Clases', requiresAuth: true },
        },
        {
          path: 'classes/templates',
          name: 'classes-templates',
          component: () => import('@/views/admin/ClassTemplatesView.vue'),
          meta: { title: 'Plantillas de clases' },
        },
        {
          path: 'classes/blocks',
          name: 'classes-blocks',
          component: () => import('@/views/admin/ScheduleBlocksView.vue'),
          meta: { title: 'Bloqueos de horario' },
        },
        {
          path: 'services',
          name: 'services',
          component: () => import('@/views/admin/ServicesView.vue'),
          meta: { title: 'Servicios' },
        },
        {
          path: 'plans',
          name: 'plans',
          component: () => import('@/views/admin/PlansView.vue'),
          meta: { title: 'Planes' },
        },
        {
          path: 'settings/profile',
          name: 'profile',
          component: () => import('@/views/admin/ProfileView.vue'),
          meta: { title: 'Mi perfil' },
        },
        {
          path: 'forbidden',
          name: 'forbidden',
          component: () => import('@/views/ForbiddenView.vue'),
          meta: { title: 'Sin permiso' },
        },
      ],
    },
    {
      path: '/',
      component: AuthLayout,
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/auth/LoginView.vue'),
          meta: { title: 'Iniciar sesión' },
        },
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: () => import('@/views/auth/ForgotPasswordView.vue'),
          meta: { title: 'Recuperar contraseña' },
        },
      ],
    },
    {
      path: '/receipts/:id',
      name: 'receipt',
      component: () => import('@/views/admin/ReceiptView.vue'),
      meta: {
        title: 'Recibo de pago',
        requiresAuth: true,
        roles: [...PERMISSIONS['payments.manage']],
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'No encontrado' },
    },
  ],
});

installGuard(router);

export default router;
