import { apiUrl } from './api';

const handleResponse = (res) => {
    if (!res.ok) return res.text().then(msg => Promise.reject(msg || `HTTP ${res.status}`));
    return res.json();
};

export const subscriptionsService = {
    getAll: () =>
        fetch(apiUrl('/api/subscriptions'), { credentials: 'include' })
            .then(handleResponse),

    create: (name) =>
        fetch(apiUrl('/api/recruitment-channels'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name }),
        }).then(handleResponse),

    update: (id, data) =>
        fetch(apiUrl(`/api/subscriptions/${id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        }).then(handleResponse),

    remove: (id) =>
        fetch(apiUrl(`/api/subscriptions/${id}`), {
            method: 'DELETE',
            credentials: 'include',
        }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); }),
};
