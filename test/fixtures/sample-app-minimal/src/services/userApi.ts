import axios from 'axios';
import { http } from '../plugins/http';

export interface UserSearchParams {
  keyword?: string;
  status?: string;
  joinedFrom?: string;
}

export async function searchUsers(params: UserSearchParams) {
  const response = await http.get('/users', { params });
  return response.data.items;
}

export async function saveUserStatus(userId: string, status: string) {
  return axios.patch(`/api/mock/users/${userId}/status`, { status });
}