import { apiUrl } from './api';

const handleResponse = (r) => {
  if (!r.ok) return r.text().then(msg => Promise.reject(msg || `HTTP ${r.status}`));
  return r.json();
};

export const recruiterService = {
  getAll: () =>
    fetch(apiUrl('/api/representatives'), { credentials: 'include' })
      .then(handleResponse)
      .catch(err => { console.error('Failed to fetch recruiters:', err); throw err; }),

  create: (data) =>
    fetch(apiUrl('/api/representatives'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
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

  getStructures: () =>
    fetch(apiUrl('/api/members/structures/tree'), { credentials: 'include' })
      .then(handleResponse)
      .catch(err => { console.error('Failed to fetch structures:', err); throw err; }),

  getRoles: () =>
    fetch(apiUrl('/api/members/userRoles'), { credentials: 'include' })
      .then(handleResponse)
      .catch(err => { console.error('Failed to fetch roles:', err); throw err; }),
};
