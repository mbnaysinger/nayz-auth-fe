// Tipos de domínio — espelham os contratos da API do nayz-auth

export type AuthMethod = 'PASSWORD' | 'PASSWORDLESS'

export const AUTH_METHODS: AuthMethod[] = ['PASSWORD', 'PASSWORDLESS']

export interface Application {
  id: string
  name: string
  auth_methods: AuthMethod[]
  is_active: boolean
  require_person: boolean
  created_at?: string
}

export interface Role {
  id: string
  application_id: string
  name: string
}

export interface Permission {
  id: string
  application_id: string
  name: string // formato recurso:acao (ex.: squads:manage)
}

export interface User {
  id: string
  username: string
  email: string
  is_active: boolean
  created_at: string
  person_id: string | null
  person_name: string | null
}

export interface Person {
  id: string
  user_id: string | null
  identifier: string
  name: string
  phone: string | null
  is_active: boolean
  birth_date: string | null
}

export interface TokenClaims {
  sub: string
  exp: number
  iat?: number
  name?: string
  roles?: string[]
  person_id?: string
  app_id?: string
}
