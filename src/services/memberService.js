import { apiUrl } from './api';

const PAGE_SIZE = 100;

export const memberService = {
  getMembers: () =>
    fetch(apiUrl('/api/members'), { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .catch(err => {
        console.error('Failed to fetch members:', err);
        throw err;
      }),

  getPageSize: () => PAGE_SIZE,

  updateMember: (updatedMember) =>
    fetch(apiUrl(`/api/members/${updatedMember.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updatedMember),
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .catch(err => {
        console.error('Failed to update member:', err);
        throw err;
      }),

  // New: update only banking fields (PATCH)
  updateBanking: (id, banking) =>
    fetch(apiUrl(`/api/members/${id}/banking`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(banking),
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .catch(err => {
        console.error('Failed to update member banking:', err);
        throw err;
      }),

  getMemberById: (id) =>
    fetch(apiUrl(`/api/members/${id}`), { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .catch(err => {
        console.error('Failed to fetch member:', err);
        throw err;
      }),

  createMember: (member) =>
    fetch(apiUrl('/api/members'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(member),
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .catch(err => {
        console.error('Failed to create member:', err);
        throw err;
      }),
};
