import { apiUrl } from './api';

export const locationService = {
  search: ({ bankName = '', branch = '', area = '', randomAccessNumber = '' } = {}) => {
    const params = new URLSearchParams({ bankName, branch, area, randomAccessNumber });
    return fetch(apiUrl(`/api/branches?${params}`), { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .catch(err => {
        console.error('Failed to search branches:', err);
        throw err;
      });
  },

  getProvinces: () =>
    fetch(apiUrl('/api/provinces'), { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .catch(err => {
        console.error('Failed to fetch provinces:', err);
        throw err;
      }),

    getDistricts: provinceId =>
      fetch(apiUrl(`/api/districts?provinceId=${provinceId}`), { credentials: 'include' })
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
          return r.json();
        })
        .catch(err => {
          console.error('Failed to fetch districts:', err);
          throw err;
        }),

    getAreas: districtId =>
      fetch(apiUrl(`/api/areas?districtId=${districtId}`), { credentials: 'include' })
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
          return r.json();
        })
        .catch(err => {
          console.error('Failed to fetch areas:', err);
          throw err;
        }),

};
