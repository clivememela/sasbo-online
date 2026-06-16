import { apiUrl } from './api';

const PAGE_SIZE = 100;

export const memberService = {
  getMembers: () => fetch(apiUrl('/api/members')).then(r => r.json()),
  getPageSize: () => PAGE_SIZE,
  updateMember: (updatedMember) =>
    fetch(apiUrl(`/api/members/${updatedMember.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedMember),
    }).then(r => r.json()),
};
