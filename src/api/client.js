import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let refreshRequest = null;

apiClient.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  const authRoute = /^\/auth\/(login|register|refresh|phone\/firebase)/.test(config?.url || '');
  if (error.response?.status !== 401 || !config || config._retry || authRoute) {
    return Promise.reject(error);
  }
  config._retry = true;
  if (!refreshRequest) {
    refreshRequest = apiClient.post('/auth/refresh')
      .then(() => true)
      .catch((refreshError) => {
        throw refreshError;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  try {
    await refreshRequest;
    return apiClient(config);
  } catch (refreshError) {
    return Promise.reject(refreshError);
  }
});

export default apiClient;
