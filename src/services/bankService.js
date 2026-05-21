const PAGE_SIZE = 100;

export const bankService = {
  getBanks: () => fetch('/api/banks').then(r => r.json()),
  getPageSize: () => PAGE_SIZE,
};
