import axios from 'axios';

export const uploadClient = axios.create({
  baseURL: '/api/uploads',
  headers: { 'Content-Type': 'multipart/form-data' },
});

export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append('avatar', file);
  return uploadClient.post('/avatar', form);
}