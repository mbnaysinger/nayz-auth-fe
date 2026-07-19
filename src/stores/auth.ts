import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { clearToken, getToken, setToken, UNAUTHORIZED_EVENT, auth } from '@/lib/api'
import { decodeToken } from '@/lib/jwt'
import type { TokenClaims } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // Token expirado ainda conta como "logado": o refresh transparente do interceptor renova
  const claims = ref<TokenClaims | null>(readClaims())

  function readClaims(): TokenClaims | null {
    const token = getToken()
    if (!token) return null
    return decodeToken(token)
  }

  const isAuthenticated = computed(() => claims.value !== null)
  const displayName = computed(() => claims.value?.name || claims.value?.sub || '')
  const isSuperAdmin = computed(() => claims.value?.roles?.includes('SUPER_ADMIN') ?? false)

  // Usado tanto pelo login com senha quanto pelo passwordless
  function setSession(token: string, refreshToken?: string) {
    setToken(token, refreshToken)
    claims.value = decodeToken(token)
  }

  async function login(identifier: string, password: string) {
    const data = await auth.login(identifier, password)
    setSession(data.token, data.refresh_token)
  }

  function logout() {
    clearToken()
    claims.value = null
  }

  // O interceptor dispara este evento quando o refresh falha definitivamente
  window.addEventListener(UNAUTHORIZED_EVENT, () => {
    claims.value = null
  })

  return { claims, isAuthenticated, displayName, isSuperAdmin, setSession, login, logout }
})
