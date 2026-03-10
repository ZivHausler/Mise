import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error?.code;
    if (status === 401) {
      const url = error.config?.url ?? '';
      const isAuthRoute = url.startsWith('/auth/') || url.startsWith('auth/');
      if (!isAuthRoute) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    } else if (status === 403 && errorCode === 'STORE_NO_ACCESS') {
      // User was removed from their store — clear session and redirect
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_has_store');
      localStorage.removeItem('auth_stores');
      localStorage.removeItem('auth_active_store_id');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
