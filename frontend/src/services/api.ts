import axios from 'axios';
import type { SimCard, Carrier, Setting, SimCardFormData, RechargeForm } from '@/types';

const api = axios.create({
  baseURL: '/api',
});

// SIM卡相关API
export const simApi = {
  getAll: () => api.get<SimCard[]>('/sim'),
  getById: (id: number) => api.get<SimCard>(`/sim/${id}`),
  create: (data: SimCardFormData) => api.post<SimCard>('/sim', data),
  update: (id: number, data: SimCardFormData) => api.put<SimCard>(`/sim/${id}`, data),
  delete: (id: number) => api.delete(`/sim/${id}`),
  recharge: (id: number, data: RechargeForm) => api.post(`/sim/${id}/recharge`, data),
};

// 运营商相关API
export const carrierApi = {
  getAll: () => api.get<Carrier[]>('/sim/carriers/all'),
  create: (data: { name: string }) => api.post<Carrier>('/sim/carriers', data),
  update: (id: number, data: { name: string }) => api.put<Carrier>(`/sim/carriers/${id}`, data),
  delete: (id: number) => api.delete(`/sim/carriers/${id}`),
};

// 设置相关API
export const settingsApi = {
  getAll: () => api.get<Setting[]>('/settings'),
  batchUpdate: (data: Record<string, string | number | boolean>) => api.post('/settings/batch', data),
  testEmail: (recipient: string) => api.post('/settings/test-email', { recipient }),
  testEmailConnection: () => api.get('/settings/test-email-connection'),
  testWechat: () => api.post('/settings/test-wechat'),
};

export default api;