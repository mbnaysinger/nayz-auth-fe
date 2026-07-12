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

// Interceptor para deslogar em caso de token expirado
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nayz_auth_token');
      // Redirecionamento é feito de forma reativa pelo Router, ou força bruta aqui
      window.dispatchEvent(new Event('nayz:unauthorized'));
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

export const setToken = (token: string) => {
  localStorage.setItem('nayz_auth_token', token);
};

export const clearToken = () => {
  localStorage.removeItem('nayz_auth_token');
};

export const auth = {
  async login(email: string, password: string) {
    try {
      // Injeta o UUID via variável de ambiente "por baixo dos panos"
      const app_id = import.meta.env.VITE_NAYZ_AUTH_APP_ID;
      const { data } = await api.post('/users/login', { app_id, email, password });
      return data; // { token, type }
    } catch (error) {
      handleError(error);
    }
  },

  async passwordlessStart(email: string) {
    try {
      const app_id = import.meta.env.VITE_NAYZ_AUTH_APP_ID;
      const { data } = await api.post('/users/passwordless/start', { app_id, email });
      return data;
    } catch (error) {
      handleError(error);
    }
  },

  async passwordlessVerify(email: string, code: string) {
    try {
      const app_id = import.meta.env.VITE_NAYZ_AUTH_APP_ID;
      const { data } = await api.post('/users/passwordless/verify', { app_id, email, code });
      return data; // { token, type }
    } catch (error) {
      handleError(error);
    }
  },
};

export const admin = {
  // TODO: Serão implementados nas próximas etapas
  async getApplications() {
    try {
      const { data } = await api.get('/admin/applications');
      return data;
    } catch (error) {
      handleError(error);
    }
  },
};

export default api;
