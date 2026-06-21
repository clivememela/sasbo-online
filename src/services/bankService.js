import { apiUrl } from './api';

const PAGE_SIZE = 100;

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const toNameKey = (value) => String(value ?? '').trim().toLowerCase();

export const bankService = {
  getBankListing: () =>
    fetch(apiUrl('/api/banks/branches'))
      .then(async (branchesResponse) => {
        if (!branchesResponse.ok) {
          throw new Error(`HTTP ${branchesResponse.status}: ${branchesResponse.statusText}`);
        }

        const branchPayload = await branchesResponse.json();
        const branches = normalizeListPayload(branchPayload);

        const banksResult = await fetch(apiUrl('/api/banks'))
          .then((banksResponse) => {
            if (!banksResponse.ok) return [];
            return banksResponse.json();
          })
          .then((banksPayload) => normalizeListPayload(banksPayload))
          .catch(() => []);

        if (banksResult.length === 0) {
          return branches;
        }

        const universalCodeByBankName = new Map(
          banksResult.map((bank) => [
            toNameKey(bank.name ?? bank.bankName),
            bank.universalBranchCode ?? bank.universal_branch_code ?? '',
          ]),
        );

        return branches.map((branch) => {
          const bankName = branch.bankName ?? branch.name ?? '';
          const bankCode = universalCodeByBankName.get(toNameKey(bankName));

          return {
            ...branch,
            universalBranchCode:
              bankCode
              ?? branch.universalBranchCode
              ?? branch.universal_branch_code
              ?? branch.branchCode
              ?? branch.randomAccessNumber,
          };
        });
      })
      .catch(err => {
        console.error('Failed to fetch bank listing:', err);
        throw err;
      }),

  getBanks: () =>
    fetch(apiUrl('/api/banks/branches'))
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .catch(err => {
        console.error('Failed to fetch banks:', err);
        throw err;
      }),

  getPageSize: () => PAGE_SIZE,

  createBank: (data) =>
    fetch(apiUrl('/api/banks/branches'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to create bank');
        return r.json();
      })
      .catch(err => {
        console.error('Failed to create bank:', err);
        throw err;
      }),

  updateBank: (id, data) =>
    fetch(apiUrl(`/api/banks/branches/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(async r => {
        if (!r.ok) throw new Error('Failed to update bank');

        const responseText = await r.text();
        if (!responseText) return { ...data, id };

        try {
          return JSON.parse(responseText);
        } catch {
          return { ...data, id };
        }
      })
      .catch(err => {
        console.error('Failed to update bank:', err);
        throw err;
      }),
};
