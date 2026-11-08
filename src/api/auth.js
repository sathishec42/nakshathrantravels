import apiClient from './client';

async function establishSession(request) {
  const response = await request;
  return response.data;
}

export function registerCustomer(details) {
  return establishSession(apiClient.post('/auth/register', details));
}

export function loginWithPassword(credentials) {
  return establishSession(apiClient.post('/auth/login', credentials));
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return response.data.user;
}
