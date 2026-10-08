/**
 * The two lists Maintenance keeps for month end's rules -- the reasons for no payroll deduction (R1; Stephne, MEN-17)
 * and the core tiers (R7; MEN-31) -- as the screens read them. Each answer is held to its shape: one of another shape is
 * *not available*, never an empty list (MV-36; the shared test fixture answers every read with `[]`).
 */

/** The reasons' answer -- `{ rows, ceiling, nameLimit, noteLimit }` -- or `null` where it is not that shape. */
export const reasonsOf = (answer) => (answer && typeof answer === 'object' && !Array.isArray(answer)
  && Array.isArray(answer.rows) && Number.isInteger(answer.ceiling) && Number.isInteger(answer.nameLimit)
  ? answer
  : null);

/** The list's order, as the server gives it: by place on the list, then by name. */
export const byPlace = (a, b) => (a.ordinal - b.ordinal) || a.name.localeCompare(b.name);

/** The reasons with `row` in its place: replacing the row it was, or added where it is new, in the list's order. */
export const withReason = (rows, row) => [...rows.filter((each) => each.id !== row.id), row].sort(byPlace);

/** A suspension code as a person reads it -- `11 · NOT ON PAYROLL` -- or its number alone where no name is on record. */
export const codeLabel = (code, name) => (name ? `${code} · ${name}` : String(code ?? ''));

/** The last place a reason can stand on the list (the server's limit for `ordinal`). */
export const PLACE_LIMIT = 999;

/** A place as typed: `''` where nothing is, the number where it is one from 1 to 999, and `null` for anything else. */
export const placeOf = (typed) => {
  const text = String(typed ?? '').trim();
  if (!text) return '';
  return /^\d{1,3}$/.test(text) && Number(text) >= 1 ? Number(text) : null;
};

/**
 * What a reason's form sends. A new reason is `{ name, suspensionCode, ordinal?, active }`: with no place it goes last.
 * A change is the same with the `version` the screen read; a field a change leaves out keeps its value, so a place
 * emptied is left out rather than sent empty.
 */
export const reasonBody = (form, version) => {
  const place = placeOf(form.ordinal);
  return {
    name: form.name.trim(),
    suspensionCode: Number(form.code),
    ...(place ? { ordinal: place } : {}),
    active: form.offered === 'yes',
    ...(version === undefined ? {} : { version }),
  };
};

/** The tiers' answer -- `{ tiers: [{ code, name, ordinal, provisional }], allOther }` -- or `null` for another shape. */
export const tiersOf = (answer) => (answer && typeof answer === 'object' && Array.isArray(answer.tiers)
  && answer.tiers.every((tier) => typeof tier?.code === 'string' && typeof tier?.name === 'string')
  && typeof answer.allOther === 'string'
  ? answer
  : null);

/** A table code in none of the tiers -- "All other institutions" -- as a choice. It is sent as `null`. */
export const OTHER = 'other';

/** A table code's tier as a choice's value: the tier's code, or {@link OTHER}. */
export const tierValue = (row) => row.coreTier ?? OTHER;

/** The tiers as choices, in their order, and every other institution last. */
export const tierChoices = (tiers) => [
  ...[...tiers.tiers].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    .map((tier) => ({ value: tier.code, label: tier.name })),
  { value: OTHER, label: tiers.allOther },
];

/** A table code's tier by its name -- `Core B` -- or the words for every other institution. */
export const tierName = (tiers, row) => tierChoices(tiers).find((choice) => choice.value === tierValue(row))?.label
  ?? tiers.allOther;

/** How many table codes stand in each tier, and in none: the choices, each with its `count`. */
export const tierCounts = (tiers, rows) => tierChoices(tiers).map((choice) => ({
  ...choice,
  count: rows.filter((row) => tierValue(row) === choice.value).length,
}));

/** Whether a table code matches what was typed: its number, its name or its employer's name, in any case. */
export const tableCodeMatches = (row, typed) => {
  const text = String(typed ?? '').trim().toLowerCase();
  if (!text) return true;
  return String(row.code).includes(text) || [row.name, row.employer].some((part) => part?.toLowerCase().includes(text));
};
