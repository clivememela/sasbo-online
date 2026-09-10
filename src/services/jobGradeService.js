import { apiUrl } from './api';
import { requestJson } from './parseApiError';
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
    } catch {
      // The NAME->CODE lookup only. A failure here means the code could not be resolved, so the
      // query below runs with whatever the caller passed -- which is the right degradation, and is
      // not the same thing as swallowing the job-grade request itself.
    }

    const qs = `?bankCode=${encodeURIComponent(String(bankCode))}`;

    return requestJson((signal) => fetch(apiUrl(`/api/job-grades${qs}`), {
      credentials: 'include',
      signal,
    }))
        .then((payload) => {
            const list = normalizeList(payload);

            const normalized = list
                .map((it) => {
                    if (!it || typeof it !== 'object') return null;

                    // If the backend sent standard React { value, label } fields
                    if (it.value != null) return it;

                    // Map your Java JobGradeResponseDto fields structurally
                    const grade = it.grade || '';
                    const description = it.description ? ` - ${it.description}` : '';
                    const contract = it.contractType ? ` (${it.contractType})` : '';

                    return {
                        value: grade,
                        label: `${grade}${description}${contract}`.trim() // E.g., "Grade 1 - Clerk (Permanent)"
                    };
                })
                .filter(Boolean);

          return normalized.length ? normalized : JOB_GRADE_OPTIONS;
        })
        /*
         * ⚠️ A25 IS STILL OPEN HERE, AND ON PURPOSE -- ITS TWO HALVES CANNOT LAND SEPARATELY.
         *
         * The register's own criterion is *"the method rejects AND the caller renders an error"*,
         * and this one `catch` is the first clause. Removing it today would make `getByBank`
         * reject into `CaptureMember` and `Members`, neither of which has an error state for a
         * reference list yet -- so the visible result would be an unhandled rejection where there
         * used to be a usable fallback. That is a worse application, not a closed row.
         *
         * ✅ WHAT DID CHANGE: the failure is now a proper error on the one path (`kind`, `status`,
         * `retryable`, the server's own message) instead of a bare `HTTP 500:`. So `06.1b` closes
         * A25 by deleting this single line and giving the two callers a per-panel error state with
         * retry (EH-D9), and the pin flips in that commit -- one move, both clauses.
         */
        .catch(() => JOB_GRADE_OPTIONS);
  }
};
