import { apiUrl } from './api';

export const locationService = {
  search: ({ bankName = '', branch = '', area = '', randomAccessNumber = '' } = {}) => {
    const params = new URLSearchParams({ bankName, branch, area, randomAccessNumber });
    return fetch(apiUrl(`/api/branches?${params}`)).then(r => r.json());
  },
  getProvinces: () => fetch(apiUrl('/api/provinces')).then(r => r.json()),
};
