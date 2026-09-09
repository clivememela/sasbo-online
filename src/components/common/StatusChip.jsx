/**
 * A member's status, as a chip. `04.2`.
 *
 * ♻️ EXTRACTED ON THE SECOND CONSUMER, NOT SPECULATIVELY. `04.2` wrote this twice in one
 * sitting — `StatusChip` in `Members.jsx`, `StatusBadge` in `Recruiters.jsx` — each with
 * its own copy of the same five-value map. Two copies of a colour table is two places for
 * the day someone adds a sixth status, and only one of them gets it.
 *
 * 🔴 WHAT BOTH ORIGINALS GOT WRONG, IN DIFFERENT AMOUNTS. The vocabulary has five values
 * and the token layer carries a text and a fill for each. `Members.jsx` mapped ONE
 * (`status === 'Active' ? green : gray`), so Pending, Suspended, Resigned and Retired all
 * rendered identically — the register drew exactly one distinction and it was not one the
 * design system makes. `Recruiters.jsx` mapped three and folded the other two into the
 * same grey as "unknown", so a resigned member and a member whose status failed to load
 * looked the same.
 *
 * ⚠️ AN UNKNOWN STATUS IS NOT STYLED AS A KNOWN ONE. It falls back to the neutral surface
 * and says "Unknown", because a status the vocabulary does not contain is a fact about the
 * data, and colouring it like "Retired" would hide that.
 */
const STATUS_TOKENS = {
  Active: 'bg-status-active-bg text-status-active',
  Pending: 'bg-status-pending-bg text-status-pending',
  Suspended: 'bg-status-suspended-bg text-status-suspended',
  Resigned: 'bg-status-resigned-bg text-status-resigned',
  Retired: 'bg-status-retired-bg text-status-retired',
};

/** The vocabulary this component knows how to render. */
export const KNOWN_STATUSES = Object.freeze(Object.keys(STATUS_TOKENS));

export default function StatusChip({ status }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${
        STATUS_TOKENS[status] || 'bg-surface-2 text-ink-muted'
      }`}
    >
      {status || 'Unknown'}
    </span>
  );
}
