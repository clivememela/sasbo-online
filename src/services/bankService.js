import { apiUrl } from './api';

const PAGE_SIZE = 100;

export const bankService = {
  getBanks: () => fetch(apiUrl('/api/banks')).then(r => r.json()),
  getPageSize: () => PAGE_SIZE,
};
