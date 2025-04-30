import { axiosInstance } from '../axiosInstance';
import { AuthData } from './types';

export const authentificate = (data: AuthData): Promise<void> => {
  return axiosInstance.post('/auth', data);
}
