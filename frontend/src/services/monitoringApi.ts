import { api } from './api';
import type { MonitoringSummary } from '../types/monitoring';

export const monitoringApi = {
  summary: (rangeHours: number) =>
    api.get<MonitoringSummary>(`/monitoring/summary?hours=${rangeHours}`),
};
