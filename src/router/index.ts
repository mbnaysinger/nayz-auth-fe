import { createRouter, createWebHistory } from 'vue-router'
import { toast } from 'vue-sonner'
import { UNAUTHORIZED_EVENT } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/auth/login'
    },
    {
      path: '/auth/login',
      name: 'Login',
      component: () => import('@/views/auth/Login.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/admin',
      name: 'AdminDashboard',
      component: () => import('@/views/admin/Dashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/applications',
      name: 'AdminApplications',
      component: () => import('@/views/admin/Applications.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/applications/:id',
      name: 'ApplicationDetails',
      component: () => import('@/views/admin/ApplicationDetails.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/users',
      name: 'AdminUsers',
      component: () => import('@/views/admin/Users.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/persons',
      name: 'AdminPersons',
      component: () => import('@/views/admin/Persons.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation Guard (Proteção de Rotas)
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // Se a rota exige autenticação e não está logado
      next({ name: 'Login' })
      return
    }
    // O console é exclusivo de SUPER_ADMIN: os claims do JWT dizem se o acesso é permitido
    if (!authStore.isSuperAdmin) {
      toast.error('Acesso restrito', {
        description: 'Seu usuário não possui a role SUPER_ADMIN nesta aplicação.'
      })
      authStore.logout()
      next({ name: 'Login' })
      return
    }
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated && authStore.isSuperAdmin) {
    // Se está na tela de login mas já possui sessão válida de admin
    next({ name: 'AdminDashboard' })
    return
  }

  next()
})

// Escutador global de erro 401 Unauthorized do Axios (refresh falhou definitivamente)
window.addEventListener(UNAUTHORIZED_EVENT, () => {
  toast.error('Sessão expirada', { description: 'Faça login novamente.' })
  router.push({ name: 'Login' })
})

export default router
