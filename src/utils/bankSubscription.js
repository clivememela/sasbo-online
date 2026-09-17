/**
 * The subscription row for a bank — the SAME lookup the server performs.
 *
 * <h2>Why this mirrors the server rather than being convenient</h2>
 * `MemberServiceImpl.resolveSubscriptionByBankName` does:
 *
 *     bankRepository.findByNameIgnoreCase(bankName)
 *         .flatMap(bank -> subscriptionsRepository.findByBankIdWithBank(bank.getId()))
 *
 * — an EXACT, case-insensitive match on the bank's name. So this does the same:
 * exact, case-insensitive, trimmed, on `bankName`.
 *
 * 🔑 It is deliberately NOT the fuzzy `includes()` match this screen uses to
 * resolve a bank CODE for the job-grade fetch. `bankBranches.js` records what that
 * difference costs: a fuzzy match here would show the user one bank's subscription
 * and the server would then save a different one — a screen that lies in the most
 * expensive way, by being nearly right. If the two rules ever have to diverge, the
 * divergence belongs in one place with a reason, not in two lookups that quietly
 * disagree.
 */

import { nameKey } from './nameKey.js'

/** The bank name a subscription row carries, under either spelling. */
export const subscriptionBankNameOf = (row) =>
  String(row?.bankName ?? row?.bank?.name ?? '').trim()

/**
 * The subscription row for `bankName`, or `null`.
 *
 * `null` rather than `undefined` so a caller can tell "looked and found nothing"
 * from "never looked" — which is the whole subject of `derivation.js`.
 */
export const findSubscriptionForBank = (subscriptions, bankName) => {
  const wanted = nameKey(bankName)
  if (!wanted) return null

  return (Array.isArray(subscriptions) ? subscriptions : []).find(
    (row) => nameKey(subscriptionBankNameOf(row)) === wanted,
  ) ?? null
}

/**
 * SASBO's own monthly subscription — the ONE amount, when there is one.
 *
 * 🗣️ The subscription is the UNION's membership fee, not a per-bank price: it is
 * "set by Subscription Maintenance and reviewed annually through business
 * discussions", once, for everybody. The reference table stores a row per bank
 * because the ACB debit DAY genuinely differs between banks — the amount does not.
 *
 * 🔴 Why this exists. The capture form derived the amount from the chosen bank
 * alone, so the field sat EMPTY until somebody picked one, reading "choose a bank
 * and its subscription appears here" — on a screen whose section is headed *Sasbo
 * Subscription*. The union's own fee is knowable before any bank is chosen, and a
 * blank box on a read-only field is indistinguishable from a member who pays
 * nothing.
 *
 * @returns the single amount every row agrees on, or `null` when the rows
 *          disagree (then it really is bank-specific and only the bank can say)
 *          or when there are no rows at all.
 */
export const sasboSubscriptionAmount = (subscriptions) => {
  const rows = Array.isArray(subscriptions) ? subscriptions : []
  if (rows.length === 0) return null

  const amounts = new Set(
    rows
      .map((row) => row?.subscriptionAmount)
      .filter((a) => a !== null && a !== undefined && a !== '')
      .map((a) => Number(a))
      .filter((a) => Number.isFinite(a)),
  )
  return amounts.size === 1 ? [...amounts][0] : null
}

/**
 * The monthly subscription amount, formatted as the form shows it.
 *
 * The server stores a `BigDecimal` and sends it as a JSON number, so `120.0`
 * arrives as `120`. Rands and cents is what an administrator expects to read on a
 * subscription, and `R120` beside `R99.99` reads as two different kinds of thing.
 */
export const formatSubscriptionAmount = (amount) => {
  // 🔴 `Number(null)`, `Number('')` and `Number([])` are all 0, so the obvious
  // `Number.isFinite(Number(amount))` renders a MISSING subscription as "0.00" —
  // a member with no subscription row shown as one who pays nothing. Those are
  // different facts and the second is the kind that reaches a finance report.
  // Only an actual number, or a string that is one, is an amount.
  if (typeof amount === 'number') return Number.isFinite(amount) ? amount.toFixed(2) : ''
  if (typeof amount !== 'string' || amount.trim() === '') return ''
  const value = Number(amount)
  return Number.isFinite(value) ? value.toFixed(2) : ''
}
