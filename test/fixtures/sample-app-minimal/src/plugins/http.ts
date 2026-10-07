import axios, { AxiosError } from 'axios';
import router from '../router';

export const http = axios.create({
  baseURL: '/api/mock',
  timeout: 7000,
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      router.push({ name: 'login', query: { reason: 'expired' } });
    }
    return Promise.reject(error);
  },
);