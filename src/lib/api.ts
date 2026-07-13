import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nayz_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Fila de Promessas para requisições travadas durante a renovação
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void, reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor Mágico de Resposta (Lida com o 401 silenciosamente)
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Se o erro foi 401 (Não autorizado) e ainda não tentamos fazer retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Rotas de login e refresh não devem ser reenviadas em caso de erro 401
      if (originalRequest.url?.includes('/users/login') || originalRequest.url?.includes('/users/refresh')) {
        return Promise.reject(error);
      }

      // Se já existe alguém fazendo Refresh, essa requisição entra pra fila
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('nayz_refresh_token');
      if (!refreshToken) {
         isRefreshing = false;
         clearToken();
         window.dispatchEvent(new Event('nayz:unauthorized'));
         return Promise.reject(error);
      }

      try {
        // Chamada manual (fugindo da instância interceptada) para evitar loop infinito
        const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users/refresh`, {
          refresh_token: refreshToken
        });
        
        const newToken = data.token;
        const newRefreshToken = data.refresh_token;

        // Atualiza a máquina toda
        setToken(newToken, newRefreshToken);
        originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
        
        processQueue(null, newToken);
        
        // Refaz a requisição original que havia falhado!
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearToken();
        window.dispatchEvent(new Event('nayz:unauthorized'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// Extrai o erro no formato padronizado do backend Go
function handleError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error || error.message;
    throw new ApiError(message, error.response?.status);
  }
  throw new ApiError('Erro desconhecido de conexão');
}

export const setToken = (token: string, refreshToken?: string) => {
  localStorage.setItem('nayz_auth_token', token);
  if (refreshToken) {
    localStorage.setItem('nayz_refresh_token', refreshToken);
  }
};

export const clearToken = () => {
  localStorage.removeItem('nayz_auth_token');
  localStorage.removeItem('nayz_refresh_token');
};

export const auth = {
  async login(identifier: string, password: string) {
    try {
      // Injeta o UUID via variável de ambiente "por baixo dos panos"
      const app_id = import.meta.env.VITE_NAYZ_AUTH_APP_ID;
      const { data } = await api.post('/users/login', { app_id, identifier, password });
      return data; // { token, type }
    } catch (error) {
      handleError(error);
    }
  },

  async passwordlessStart(identifier: string) {
    try {
      const app_id = import.meta.env.VITE_NAYZ_AUTH_APP_ID;
      const { data } = await api.post('/users/passwordless/start', { app_id, identifier });
      return data;
    } catch (error) {
      handleError(error);
    }
  },

  async passwordlessVerify(identifier: string, code: string) {
    try {
      const app_id = import.meta.env.VITE_NAYZ_AUTH_APP_ID;
      const { data } = await api.post('/users/passwordless/verify', { app_id, identifier, code });
      return data; // { token, type }
    } catch (error) {
      handleError(error);
    }
  },
};

export const admin = {
  async getApplications() {
    try {
      const { data } = await api.get('/admin/applications');
      return data; // Array de objetos da Aplicação
    } catch (error) {
      handleError(error);
    }
  },

  async createApplication(payload: { name: string, auth_methods: string[] }) {
    try {
      const { data } = await api.post('/admin/applications', payload);
      return data;
    } catch (error) {
      handleError(error);
    }
  },

  async deleteApplication(id: string) {
    try {
      const { data } = await api.delete(`/admin/applications/${id}`);
      return data;
    } catch (error) {
      handleError(error);
    }
  },

  // --- ROLES (PERFIS DE ACESSO) ---
  async getRolesByApp(appId: string) {
    try {
      const { data } = await api.get(`/admin/applications/${appId}/roles`);
      return data;
    } catch (error) {
      handleError(error);
    }
  },
  async createRole(appId: string, payload: { name: string }) {
    try {
      const { data } = await api.post(`/admin/applications/${appId}/roles`, payload);
      return data;
    } catch (error) {
      handleError(error);
    }
  },
  async deleteRole(roleId: string) {
    try {
      const { data } = await api.delete(`/admin/roles/${roleId}`);
      return data;
    } catch (error) {
      handleError(error);
    }
  },

  // --- ATRIBUIÇÃO A USUÁRIOS ---
  async assignRoleToUser(userId: string, roleId: string) {
    try {
      const { data } = await api.post(`/admin/users/${userId}/roles/${roleId}`);
      return data;
    } catch (error) {
      handleError(error);
    }
  },
  async removeRoleFromUser(userId: string, roleId: string) {
    try {
      const { data } = await api.delete(`/admin/users/${userId}/roles/${roleId}`);
      return data;
    } catch (error) {
      handleError(error);
    }
  }
};

export default api;
