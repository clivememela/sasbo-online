import { apiUrl } from './api';
import { JOB_GRADE_OPTIONS } from '../config/memberConstants.js';
import { bankService } from './bankService.js';

const normalizeList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

export const jobGradeService = {
  // Attempts to fetch job grades for a given bank name from the backend.
  // Falls back to the static JOB_GRADE_OPTIONS when the API is not available or returns an empty list.
  // bankIdentifier may be a bank code (preferred) or a human-readable bank name.
  // When given a human name we attempt to resolve it to a bank code using bankService.
  getByBank: async (bankIdentifier) => {
    if (!bankIdentifier) return Promise.resolve(JOB_GRADE_OPTIONS);
    // If the identifier looks like a code (no spaces, short), use as-is; otherwise try to resolve.
    let bankCode = String(bankIdentifier || '').trim();
    try {
      if (bankCode.includes(' ')) {
        // Attempt to resolve human-readable bank name to a universal code via bankService
        const listing = await bankService.getBankListing();
        const normalized = String(bankCode).trim().toLowerCase();
        const found = listing.find((b) => {
          const bn = String(b.bankName || b.name || '').trim().toLowerCase();
          return bn === normalized || bn.includes(normalized) || normalized.includes(bn);
        });
        if (found && found.universalBranchCode) bankCode = found.universalBranchCode;
      }
    } catch (e) {
      // ignore resolution errors and continue using raw identifier
    }

    const qs = `?bankCode=${encodeURIComponent(String(bankCode))}`;
    return fetch(apiUrl(`/api/job-grades${qs}`), { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          // Graceful fallback
          return JOB_GRADE_OPTIONS;
        }
        const payload = await r.json();
        const list = normalizeList(payload);
        // If API returns objects with label/value, map to simple strings
        const normalized = list.map((it) => (typeof it === 'string' ? it : (it.value ?? it.label ?? ''))).filter(Boolean);
        return normalized.length ? normalized : JOB_GRADE_OPTIONS;
      })
      .catch(() => JOB_GRADE_OPTIONS);
  }
};

