import { apiUrl } from './api';

const PAGE_SIZE = 100;

export const bankService = {
  getBanks: () =>
    fetch(apiUrl('/api/banks/branches'))
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .catch(err => {
        console.error('Failed to fetch banks:', err);
        throw err;
      }),

  getPageSize: () => PAGE_SIZE,

  createBank: (data) =>
    fetch(apiUrl('/api/banks/branches'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to create bank');
        return r.json();
      })
      .catch(err => {
        console.error('Failed to create bank:', err);
        throw err;
      }),

  updateBank: (id, data) =>
    fetch(apiUrl(`/api/banks/branches/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(async r => {
        if (!r.ok) throw new Error('Failed to update bank');

        const responseText = await r.text();
        if (!responseText) return { ...data, id };

        try {
          return JSON.parse(responseText);
        } catch {
          return { ...data, id };
        }
      })
      .catch(err => {
        console.error('Failed to update bank:', err);
        throw err;
      }),
};
