import { createRouter, createWebHistory } from 'vue-router'

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
    }
  ]
})

// Navigation Guard (Proteção de Rotas)
router.beforeEach((to, _from, next) => {
  const isAuthenticated = !!localStorage.getItem('nayz_auth_token')

  if (to.meta.requiresAuth && !isAuthenticated) {
    // Se a rota exige autenticação e não está logado
    next({ name: 'Login' })
  } else if (to.meta.requiresGuest && isAuthenticated) {
    // Se está na tela de login mas já possui token
    next({ name: 'AdminDashboard' })
  } else {
    next()
  }
})

// Escutador global de erro 401 Unauthorized do Axios
window.addEventListener('nayz:unauthorized', () => {
  router.push({ name: 'Login' })
})

export default router
