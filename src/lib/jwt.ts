import type { TokenClaims } from '@/types'

// Decodifica o payload do JWT sem validar assinatura (a validação é do backend;
// aqui os claims servem apenas para conveniência de UI: nome, roles, person_id)
export function decodeToken(token: string): TokenClaims | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json) as TokenClaims
  } catch {
    return null
  }
}

export function isExpired(claims: TokenClaims): boolean {
  return claims.exp * 1000 <= Date.now()
}
