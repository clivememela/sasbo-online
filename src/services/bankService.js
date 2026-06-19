import { apiUrl } from './api';

const PAGE_SIZE = 100;

export const bankService = {
  getBanks: () => fetch(apiUrl('/api/banks')).then(r => r.json()),
  getPageSize: () => PAGE_SIZE,
  createBank: (data) => fetch(apiUrl('/api/banks'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => { if (!r.ok) throw new Error('Failed to create bank'); return r.json(); }),
};
