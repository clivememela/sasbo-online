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

const toComparableNameKey = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => ![
      'the',
      'of',
      'limited',
      'ltd',
      'bank',
      'pty',
      'sa',
      'south',
      'africa',
      'group',
      'holdings',
    ].includes(token))
    .join(' ')
    .trim();

const toCodeValue = (value) => String(value ?? '').trim();

const toBranchCodeKey = (value) => String(value ?? '').trim().toLowerCase();

const getUniversalCode = (record) =>
  toCodeValue(
    record?.universalBranchCode
    ?? record?.universal_branch_code
    ?? record?.universalCode
    ?? record?.universal_code,
  );

export const bankService = {
  getBankListing: () =>
    fetch(apiUrl('/api/banks/branches'), { credentials: 'include' })
      .then(async (branchesResponse) => {
        if (!branchesResponse.ok) {
          throw new Error(`HTTP ${branchesResponse.status}: ${branchesResponse.statusText}`);
        }

        const branchPayload = await branchesResponse.json();
        const branches = normalizeListPayload(branchPayload);

        const banksResult = await fetch(apiUrl('/api/banks'), { credentials: 'include' })
          .then((banksResponse) => {
            if (!banksResponse.ok) return [];
            return banksResponse.json();
          })
          .then((banksPayload) => normalizeListPayload(banksPayload))
          .catch(() => []);

        if (banksResult.length === 0) {
          return branches;
        }

        const universalCodeByBankName = new Map();
        const universalCodeByBranchId = new Map();
        const universalCodeByBranchCode = new Map();

        banksResult.forEach((bank) => {
          const bankName = bank.name ?? bank.bankName;
          const universalCode = getUniversalCode(bank);
          const exactKey = toNameKey(bankName);
          const comparableKey = toComparableNameKey(bankName);

          if (exactKey && universalCode && !universalCodeByBankName.has(exactKey)) {
            universalCodeByBankName.set(exactKey, universalCode);
          }

          if (comparableKey && universalCode && !universalCodeByBankName.has(comparableKey)) {
            universalCodeByBankName.set(comparableKey, universalCode);
          }

          if (Array.isArray(bank.branches) && universalCode) {
            bank.branches.forEach((branch) => {
              if (branch?.id !== undefined && branch?.id !== null && !universalCodeByBranchId.has(branch.id)) {
                universalCodeByBranchId.set(branch.id, universalCode);
              }

              const branchCodeKey = toBranchCodeKey(branch?.branchCode ?? branch?.branch_code);
              if (branchCodeKey && !universalCodeByBranchCode.has(branchCodeKey)) {
                universalCodeByBranchCode.set(branchCodeKey, universalCode);
              }
            });
          }
        });

        return branches.map((branch) => {
          const bankName = branch.bankName ?? branch.name ?? '';
          const exactKey = toNameKey(bankName);
          const comparableKey = toComparableNameKey(bankName);
          const branchCodeKey = toBranchCodeKey(branch.branchCode ?? branch.branch_code);
          const bankCode =
            universalCodeByBranchId.get(branch.id)
            ?? universalCodeByBranchCode.get(branchCodeKey)
            ?? universalCodeByBankName.get(exactKey)
            ?? universalCodeByBankName.get(comparableKey);

          return {
            ...branch,
            universalBranchCode:
              bankCode
              ?? branch.universalBranchCode
              ?? branch.universal_branch_code
              ?? branch.bank?.universalBranchCode
              ?? branch.bank?.universal_branch_code
              ?? '',
          };
        });
      })
      .catch(err => {
        console.error('Failed to fetch bank listing:', err);
        throw err;
      }),

  getBankNames: () =>
    fetch(apiUrl('/api/banks'), { credentials: 'include' })
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(payload => {
        const banks = normalizeListPayload(payload);
        return banks
          .map(bank => bank.name ?? bank.bankName ?? '')
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      })
      .catch(err => {
        console.error('Failed to fetch bank names:', err);
        return [];
      }),

  getBanks: () =>
    fetch(apiUrl('/api/banks/branches'), { credentials: 'include' })
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
