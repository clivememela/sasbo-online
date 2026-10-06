/**
 * What a menu entry that needs a permission shows a caller (`contracts/permissions.md`, "Menus").
 *
 * Two data keys on any entry of `navigation.js` -- the rail and a menu page read them the same way:
 *   `permission`   what the entry's screen needs, a name from `auth/permissions.js`;
 *   `hideWithout`  hide it from a SIGNED-IN user who lacks that permission. Unpaids and payroll discrepancies are
 *                  never shown to organisers (Stephne, DOD-14; PAY), so their entries are hidden from them outright.
 *
 * An anonymous caller still sees every entry, marked, because the screen behind it says how to sign in -- and until
 * SASBO's users exist, the link is used by people who have no account yet. An entry with no `permission` is open, as
 * every entry was before sign-in.
 *
 * @returns {'open' | 'locked' | 'hidden'}
 */
export const entryAccess = (entry, { status, can }) => {
  if (!entry?.permission || can(entry.permission)) return 'open';
  return entry.hideWithout && status === 'signed-in' ? 'hidden' : 'locked';
};

/** The word beside a locked entry: how to get in, for the caller in front of it. */
export const lockedNote = (status) => (status === 'signed-in' ? 'No access' : 'Sign in');
