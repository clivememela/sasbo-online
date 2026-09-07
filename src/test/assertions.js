import { expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { axe } from 'vitest-axe'

/**
 * The shared assertions. A contract holds because ONE function enforces it,
 * not because every author remembered.
 *
 * Every message here names the CONSEQUENCE, not the mismatch.
 * `expected [] to equal ['Passport']` says what differed; "compared against a
 * value no option can produce -- this branch can never be true" says what
 * breaks. The second is what makes a red run actionable by someone who did not
 * write the test.
 */

/**
 * The three-state rule, asserted as ONE thing.
 *
 * An error rendered as an empty table is a CONFIDENT WRONG ANSWER: it tells an
 * administrator there are no members when the backend is down. Only an
 * assertion that checks BOTH halves can tell the two apart -- the error
 * affordance present AND the empty-state text absent -- which is why this is a
 * single helper and not a habit repeated on every list page.
 *
 * @param options.emptyText text the EMPTY state renders and the error state
 *                          must not. Required: without it this helper degrades
 *                          into "something rendered".
 * @param options.container optional scope, for a page with several regions.
 */
export async function expectErrorState({ emptyText, container } = {}) {
  if (!emptyText) {
    throw new Error(
      'expectErrorState needs the empty-state text. Without it this assertion cannot ' +
        'distinguish "the backend is down" from "there is nothing here", which is the ' +
        'entire defect it exists to catch.',
    )
  }

  const scope = container ? within(container) : screen

  const errorAffordance =
    scope.queryByRole('alert') ??
    scope.queryByText(/error|failed|unable|try again|something went wrong/i)

  expect(
    errorAffordance,
    'THE CONFIDENT WRONG ANSWER: the request failed and the page shows no error ' +
      'affordance at all. An administrator reads this screen as "the data is fine"; ' +
      'it means "the backend is down". A failed list must announce itself.',
  ).not.toBeNull()

  expect(
    scope.queryByText(emptyText),
    `THE CONFIDENT WRONG ANSWER: the request failed and the page is still showing the ` +
      `EMPTY state ("${emptyText}"). "There are no records" and "we could not reach the ` +
      `server" are different facts, and this screen is reporting the wrong one.`,
  ).toBeNull()

  const retry =
    scope.queryByRole('button', { name: /retry|try again|reload|refresh/i }) ??
    scope.queryByRole('link', { name: /retry|try again|reload|refresh/i })

  return { errorAffordance, retry }
}

/**
 * A field was rejected, asserted BY FIELD NAME rather than by message.
 *
 * Asserting the message couples every validation test to copy, so a wording
 * change reddens tests that have nothing to do with the rule. The stable fact
 * is which field the form refused.
 */
export function expectFieldRejected(field, { container } = {}) {
  const scope = container ? within(container) : screen

  const control =
    scope.queryByLabelText(new RegExp(field, 'i')) ?? scope.queryByRole('textbox', { name: new RegExp(field, 'i') })

  expect(
    control,
    `expectFieldRejected("${field}") could not find that field at all. A validation ` +
      `assertion against a field that is not on the page passes for the wrong reason ` +
      `the day the field is renamed.`,
  ).not.toBeNull()

  const invalid =
    control.getAttribute('aria-invalid') === 'true' ||
    Boolean(control.getAttribute('aria-errormessage')) ||
    Boolean(
      control.id &&
        scope.queryByText((_, el) => el?.getAttribute?.('data-error-for') === control.id),
    ) ||
    // Fallback: the form renders the error as a sibling of the control.
    Boolean(control.parentElement?.querySelector('[role="alert"], .text-red-500, .error'))

  expect(
    invalid,
    `The form ACCEPTED "${field}" when the rule says it must reject it. A validator ` +
      `that never refuses anything is indistinguishable from no validator, and the ` +
      `bad value reaches the API -- which does not check it either.`,
  ).toBe(true)
}

/**
 * The accessibility gate.
 *
 * `color-contrast` is OFF. jsdom has no canvas, so axe cannot compute contrast
 * at all -- it does not fail, it silently reports nothing. Saying that here is
 * more honest than carrying a rule that cannot run. Contrast is a
 * device-matrix job and is out of this arc's scope, recorded rather than
 * pretended.
 */
export const AXE_RULES = { 'color-contrast': { enabled: false } }

export async function expectNoA11yViolations(container, { rules = {} } = {}) {
  const results = await axe(container, {
    rules: {
      ...AXE_RULES,
      ...rules,
    },
  })

  const violations = results.violations ?? []
  const summary = violations
    .map(
      (v) =>
        `  - ${v.id} (${v.impact}): ${v.help}\n` +
        v.nodes.map((n) => `      at ${[n.target].flat().join(' ')}`).join('\n'),
    )
    .join('\n')

  expect(
    violations,
    `This surface has ${violations.length} accessibility violation(s). Each one is a ` +
      `member or an administrator who cannot complete the task at all:\n${summary}`,
  ).toHaveLength(0)
}
