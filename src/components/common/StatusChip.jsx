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

const BY_LOWER_CASE = new Map(
  Object.entries(STATUS_TOKENS).map(([status, classes]) => [status.toLowerCase(), classes]),
);

/**
 * 🔑 THE LOOKUP IS CASE-INSENSITIVE BECAUSE THERE ARE TWO VOCABULARIES, and the
 * vocabulary guard is what established that rather than an assumption.
 *
 * A MEMBER's status is title case (`Active`) and comes from `STATUS_OPTIONS`. A
 * SUBSCRIPTION's is upper case (`ACTIVE`) because the server declares
 * `SubscriptionsStatus {PENDING, ACTIVE, CANCELLED, INACTIVE}` with no display names, so
 * Jackson puts the enum NAME on the wire -- and `vocabulary.parity.test.js` records that
 * as ACCEPTED, not as drift. They are different lists that happen to share a field name.
 *
 * ⚠️ SO THE VALUE IS RENDERED AS IT ARRIVED, never normalised. The first draft
 * title-cased subscription statuses so this map would match, which changed what a
 * subscription's status READS as on screen and quietly implied the two vocabularies were
 * one. Only the colour lookup ignores case.
 *
 * 🔴 AND AN UNKNOWN VALUE FALLS BACK TO NEUTRAL, WHICH IS THE POINT. `CANCELLED` and
 * `INACTIVE` belong to the subscription list and have no colour here, so they get the
 * quiet surface -- where the copy this replaced painted them with the SUSPENDED red. A
 * cancelled subscription and a suspended member are different facts about a member's
 * money, and they were rendering identically.
 */
export default function StatusChip({ status }) {
  const classes =
    typeof status === 'string' ? BY_LOWER_CASE.get(status.toLowerCase()) : undefined;

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${
        classes || 'bg-surface-2 text-ink-muted'
      }`}
    >
      {status || 'Unknown'}
    </span>
  );
}
