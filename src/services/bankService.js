import { apiUrl } from './api';
import { requestJson, requestJsonWrite, requestOptionalJson } from './parseApiError';

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
    requestJson((signal) => fetch(apiUrl('/api/banks/branches'), {
      credentials: 'include',
      signal,
    }))
      .then(async (branchPayload) => {
        const branches = normalizeListPayload(branchPayload);

        // 🔑 THE SECOND CALL IS AN ENRICHMENT, AND ITS FALLBACK IS DELIBERATE -- one of the very
        // few places in this file where swallowing is correct. `/api/banks` supplies the universal
        // branch codes; without them the listing still renders, with that one column empty. So a
        // failure here degrades the row rather than losing the page, which is EH-D9's rule
        // (partial failure stays partial) rather than A13's defect (failure indistinguishable from
        // emptiness) -- the difference being that the PRIMARY call above now rejects properly.
        const banksResult = await requestJson((signal) => fetch(apiUrl('/api/banks'), {
          credentials: 'include',
          signal,
        })).then((banksPayload) => normalizeListPayload(banksPayload)).catch(() => []);

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
      }),

  /**
   * 🔴 A13, AND THIS METHOD IS THE WHOLE REASON THAT ROW EXISTS. It ended in
   *
   *     .catch(err => { console.error(...); return []; })
   *
   * so a 500, a network failure and a non-JSON body ALL resolved with an empty array — and eight
   * consumers across seven screens then rendered *"no banks"*. A down backend and a database with
   * no banks in it were the same result, and the only trace was a console line no user sees. That
   * is A27's class in the service layer: a confident wrong answer one level below where the
   * three-state rule looks for it.
   *
   * ✅ FIXED HERE UNDER BR-12, with the owner's nod recorded in the 2026-09-09 dialog: this unit
   * makes `bankService` distinguish failure from emptiness. It now REJECTS, and an empty array
   * means the server genuinely returned no banks.
   *
   * ⚠️ THIS REDDENS A13's PIN BY DESIGN, and the correct response is to flip the pin/disabled pair
   * and close the register row — never to restore the `catch` (contract ④).
   */
  getBankNames: () =>
    requestJson((signal) => fetch(apiUrl('/api/banks'), {
      credentials: 'include',
      signal,
    })).then((payload) => normalizeListPayload(payload)
      .map((bank) => bank.name ?? bank.bankName ?? '')
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))),

  getBanks: () =>
    requestJson((signal) => fetch(apiUrl('/api/banks/branches'), {
      credentials: 'include',
      signal,
    })),

  getPageSize: () => PAGE_SIZE,

  createBank: (data) =>
    requestJsonWrite((signal) => fetch(apiUrl('/api/banks/branches'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal,
    })),

  /**
   * ⚠️ A26 IS DELIBERATELY LEFT OPEN HERE, AND THE REASON IS A CLASSIFICATION, NOT A DEFERRAL.
   *
   * A26 records that `updateBank` resolves on a 2xx whose body is not JSON. It does — and for a
   * PUT that is the CORRECT behaviour, not a defect: this endpoint answers some deployments with
   * the updated record and others with an empty 200, and a write that succeeded is a write that
   * succeeded. Rejecting because the server chose not to echo the row back would turn a saved
   * change into a reported failure, which is worse than the row it is filed under.
   *
   * So it is classified as a BODY-LESS WRITE (`parseBody: false`) — the same treatment the three
   * DELETEs get and for the same reason — and the optimistic `{ ...data, id }` result stays. What
   * changes is the FAILURE path: a 4xx/5xx now rejects with the server's own message, `status`
   * and `validationErrors` instead of the string `'Failed to update bank'`.
   *
   * 🔑 A26's PIN THEREFORE STAYS GREEN AND THE ROW STAYS OPEN, on purpose. Whether the row should
   * be re-scoped or closed as "not a defect" is a REGISTER decision, and the register is the
   * single id namespace — not something an error-handling commit gets to settle quietly
   * (contract ⑥).
   */
  updateBank: async (id, data) => {
    const updated = await requestOptionalJson((signal) => fetch(apiUrl(`/api/banks/branches/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal,
    }));
    // The echo when there is one, the optimistic result when there is not.
    return updated ?? { ...data, id };
  },
};
