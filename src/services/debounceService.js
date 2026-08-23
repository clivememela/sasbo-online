import { apiUrl } from './api';

export const debounceService = {
  useDebounce: (fn, delay) =>
    fetch(apiUrl(`/api/debounce?fn=${fn}&delay=${delay}`), { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .catch(err => {
        console.error('Failed to use useDebounce:', err);
        throw err;
      }),
};