import { apiUrl } from './api';

const handleResponse = (data) => {
    console.log("Inspecting payload:", data);
    if (!data.ok) return data.text().then(msg => Promise.reject(msg || `HTTP ${data.status}`));
    return data.json();
};

export const subscriptionsService = {
    getAll: () =>
        fetch(apiUrl('/api/subscriptions'), { credentials: 'include' })
            .then(handleResponse),

    create: (name) =>
        fetch(apiUrl('/api/recruiter-types'), {
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
