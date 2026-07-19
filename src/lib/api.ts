import axios, { AxiosError } from 'axios';
import type { Application, AuthMethod, Permission, Person, Role, User } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const APP_ID = import.meta.env.VITE_NAYZ_AUTH_APP_ID;

// Chaves de sessão no localStorage
const TOKEN_KEY = 'nayz_token';
const REFRESH_KEY = 'nayz_refresh_token';

export const UNAUTHORIZED_EVENT = 'nayz:unauthorized';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string, refreshToken?: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Fila de Promessas para requisições travadas durante a renovação (anti-corrida)
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void, reject: (error: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor de Resposta (lida com o 401 silenciosamente via refresh token)
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    // Se o erro foi 401 (Não autorizado) e ainda não tentamos fazer retry
    if (originalRequest && error.response?.status === 401 && !originalRequest._retry) {

      // Rotas de login e refresh não devem ser reenviadas em caso de erro 401
      if (originalRequest.url?.includes('/users/login') || originalRequest.url?.includes('/users/refresh')) {
        return Promise.reject(error);
      }

      // Se já existe alguém fazendo Refresh, essa requisição entra pra fila
      if (isRefreshing) {
        return new Promise<string>(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers!.Authorization = 'Bearer ' + token;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) {
        isRefreshing = false;
        clearToken();
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
        return Promise.reject(error);
      }

      try {
        // Chamada manual (fugindo da instância interceptada) para evitar loop infinito
        const { data } = await axios.post(`${API_BASE}/users/refresh`, {
          refresh_token: refreshToken
        });

        const newToken = data.token as string;
        const newRefreshToken = data.refresh_token as string | undefined;

        setToken(newToken, newRefreshToken);
        originalRequest.headers!.Authorization = 'Bearer ' + newToken;

        processQueue(null, newToken);

        // Refaz a requisição original que havia falhado!
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearToken();
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export class ApiError extends Error {
  constructor(public override message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// Extrai o erro no formato padronizado do backend Go: {"error": "mensagem"}
function handleError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error || error.message;
    throw new ApiError(message, error.response?.status);
  }
  throw new ApiError('Erro desconhecido de conexão');
}

// ---------------------------------------------------------------------------
// Rotas públicas: fluxos de autenticação
// ---------------------------------------------------------------------------

export interface LoginResponse {
  token: string;
  refresh_token: string;
  type?: string;
}

export const auth = {
  async login(identifier: string, password: string) {
    try {
      const { data } = await api.post('/users/login', { app_id: APP_ID, identifier, password });
      return data as LoginResponse;
    } catch (error) {
      handleError(error);
    }
  },

  async passwordlessStart(identifier: string) {
    try {
      const { data } = await api.post('/users/passwordless/start', { app_id: APP_ID, identifier });
      return data;
    } catch (error) {
      handleError(error);
    }
  },

  async passwordlessVerify(identifier: string, code: string) {
    try {
      const { data } = await api.post('/users/passwordless/verify', { app_id: APP_ID, identifier, code });
      return data as LoginResponse;
    } catch (error) {
      handleError(error);
    }
  },

  async register(email: string, username: string, password: string) {
    try {
      const { data } = await api.post('/users/register', { email, username, password });
      return data;
    } catch (error) {
      handleError(error);
    }
  },
};

// ---------------------------------------------------------------------------
// Rotas administrativas (Bearer token de SUPER_ADMIN)
// ---------------------------------------------------------------------------

export interface PersonPayload {
  user_id?: string | null;
  identifier: string;
  name: string;
  phone?: string | null;
  is_active: boolean;
  birth_date?: string | null;
}

export const admin = {
  // --- APLICAÇÕES ---
  async getApplications() {
    try {
      const { data } = await api.get('/admin/applications');
      return (data ?? []) as Application[];
    } catch (error) {
      handleError(error);
    }
  },

  async createApplication(payload: { name: string, auth_methods: AuthMethod[] }) {
    try {
      const { data } = await api.post('/admin/applications', payload);
      return data as Application;
    } catch (error) {
      handleError(error);
    }
  },

  async updateApplication(id: string, payload: { name: string, auth_methods: AuthMethod[], is_active: boolean }) {
    try {
      const { data } = await api.put(`/admin/applications/${id}`, payload);
      return data as Application;
    } catch (error) {
      handleError(error);
    }
  },

  async deleteApplication(id: string) {
    try {
      await api.delete(`/admin/applications/${id}`);
    } catch (error) {
      handleError(error);
    }
  },

  // --- ROLES (PERFIS DE ACESSO) ---
  async getRolesByApp(appId: string) {
    try {
      const { data } = await api.get(`/admin/applications/${appId}/roles`);
      return (data ?? []) as Role[];
    } catch (error) {
      handleError(error);
    }
  },

  async createRole(appId: string, payload: { name: string }) {
    try {
      const { data } = await api.post(`/admin/applications/${appId}/roles`, payload);
      return data as Role;
    } catch (error) {
      handleError(error);
    }
  },

  async deleteRole(roleId: string) {
    try {
      await api.delete(`/admin/roles/${roleId}`);
    } catch (error) {
      handleError(error);
    }
  },

  // --- PERMISSIONS ---
  async getPermissionsByApp(appId: string) {
    try {
      const { data } = await api.get(`/admin/applications/${appId}/permissions`);
      return (data ?? []) as Permission[];
    } catch (error) {
      handleError(error);
    }
  },

  async createPermission(appId: string, payload: { name: string }) {
    try {
      const { data } = await api.post(`/admin/applications/${appId}/permissions`, payload);
      return data as Permission;
    } catch (error) {
      handleError(error);
    }
  },

  async deletePermission(permissionId: string) {
    try {
      await api.delete(`/admin/permissions/${permissionId}`);
    } catch (error) {
      handleError(error);
    }
  },

  // --- COMPOSIÇÃO ROLE x PERMISSIONS ---
  async getRolePermissions(roleId: string) {
    try {
      const { data } = await api.get(`/admin/roles/${roleId}/permissions`);
      return (data ?? []) as Permission[];
    } catch (error) {
      handleError(error);
    }
  },

  async addPermissionToRole(roleId: string, permissionId: string) {
    try {
      await api.post(`/admin/roles/${roleId}/permissions/${permissionId}`);
    } catch (error) {
      handleError(error);
    }
  },

  async removePermissionFromRole(roleId: string, permissionId: string) {
    try {
      await api.delete(`/admin/roles/${roleId}/permissions/${permissionId}`);
    } catch (error) {
      handleError(error);
    }
  },

  // --- USUÁRIOS ---
  async getUsers() {
    try {
      const { data } = await api.get('/admin/users');
      return (data ?? []) as User[];
    } catch (error) {
      handleError(error);
    }
  },

  async setUserActive(userId: string, isActive: boolean) {
    try {
      await api.patch(`/admin/users/${userId}/active`, { is_active: isActive });
    } catch (error) {
      handleError(error);
    }
  },

  async getUserRoles(userId: string) {
    try {
      const { data } = await api.get(`/admin/users/${userId}/roles`);
      return (data ?? []) as Role[];
    } catch (error) {
      handleError(error);
    }
  },

  async assignRoleToUser(userId: string, roleId: string) {
    try {
      await api.post(`/admin/users/${userId}/roles/${roleId}`);
    } catch (error) {
      handleError(error);
    }
  },

  async removeRoleFromUser(userId: string, roleId: string) {
    try {
      await api.delete(`/admin/users/${userId}/roles/${roleId}`);
    } catch (error) {
      handleError(error);
    }
  },

  // --- PESSOAS ---
  async getPersons() {
    try {
      const { data } = await api.get('/admin/persons');
      return (data ?? []) as Person[];
    } catch (error) {
      handleError(error);
    }
  },

  async getPerson(id: string) {
    try {
      const { data } = await api.get(`/admin/persons/${id}`);
      return data as Person;
    } catch (error) {
      handleError(error);
    }
  },

  async createPerson(payload: PersonPayload) {
    try {
      const { data } = await api.post('/admin/persons', payload);
      return data as Person;
    } catch (error) {
      handleError(error);
    }
  },

  async updatePerson(id: string, payload: PersonPayload) {
    try {
      const { data } = await api.put(`/admin/persons/${id}`, payload);
      return data as Person;
    } catch (error) {
      handleError(error);
    }
  },

  async deletePerson(id: string) {
    try {
      await api.delete(`/admin/persons/${id}`);
    } catch (error) {
      handleError(error);
    }
  },
};

export default api;
