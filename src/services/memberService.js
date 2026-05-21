const PAGE_SIZE = 100;

export const memberService = {
  getMembers: () => fetch('/api/members').then(r => r.json()),
  getPageSize: () => PAGE_SIZE,
  updateMember: (updatedMember) =>
    fetch(`/api/members/${updatedMember.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedMember),
    }).then(r => r.json()),
};
