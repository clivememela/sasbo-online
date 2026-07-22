import { apiUrl } from './api';

const handleResponse = (r) => {
  if (!r.ok) return r.text().then(msg => Promise.reject(msg || `HTTP ${r.status}`));
  return r.json();
};

export const recruiterTypeService = {
  getAll: () =>
    fetch(apiUrl('/api/recruiter-types'), { credentials: 'include' }).then(handleResponse),

  create: (name) =>
    fetch(apiUrl('/api/recruiter-types'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    }).then(handleResponse),

  update: (id, data) =>
    fetch(apiUrl(`/api/recruiter-types/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(handleResponse),

  remove: (id) =>
    fetch(apiUrl(`/api/recruiter-types/${id}`), {
      method: 'DELETE',
      credentials: 'include',
    }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); }),
};
