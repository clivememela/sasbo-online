import { apiUrl } from './api';

const handleResponse = (r) => {
  if (!r.ok) return r.text().then(msg => Promise.reject(msg || `HTTP ${r.status}`));
  return r.json();
};

export const representativeService = {
  getAll: () =>
    fetch(apiUrl('/api/representatives'), { credentials: 'include' })
      .then(handleResponse)
      .catch(err => { console.error('Failed to fetch representatives:', err); throw err; }),

  create: (name) =>
    fetch(apiUrl('/api/representatives'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    }).then(handleResponse),

  update: (id, data) =>
    fetch(apiUrl(`/api/representatives/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(handleResponse),

  remove: (id) =>
    fetch(apiUrl(`/api/representatives/${id}`), {
      method: 'DELETE',
      credentials: 'include',
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }),
};
