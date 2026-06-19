import { apiUrl } from './api';

export const representativeService = {
    getAll: () => fetch(apiUrl('/api/representatives')).then(r => r.json()),

    create: (name) =>
        fetch(apiUrl('/api/representatives'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        }).then(r => {
            if (!r.ok) return r.text().then(msg => Promise.reject(msg));
            return r.json();
        }),

    remove: (id) =>
        fetch(apiUrl(`/api/representatives/${id}`), { method: 'DELETE' }),

    update: (id, data) =>
        fetch(apiUrl(`/api/representatives/${id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(r => {
            if (!r.ok) return r.text().then(msg => Promise.reject(msg));
            return r.json();
        }),
};
