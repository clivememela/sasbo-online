import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from './apiContractScan.js'

/**
 * CM-29 -- THE DEPLOYED CLIENT'S `/api` REWRITE POINTED AT A PARKING DOMAIN.
 *
 * `vercel.json` read, in full:
 *
 *   { "source": "/api/(.*)", "destination": "https://onrender.com" }
 *
 * Two defects in one line. The host is `onrender.com`, the PLATFORM's apex, not
 * this application's backend on it -- and the destination carries no `$1`, so
 * even against the right host every path collapsed to `/`. `POST /api/members`
 * and `GET /api/banks` became the same request to somebody else's landing page.
 *
 * 🔴 WHY NO EXISTING CHECK COULD SEE IT, and why it needs a test of its own.
 * This rule is only ever consulted when the client is built with NO
 * `VITE_API_BASE_URL` -- `apiUrl()` returns a RELATIVE path in that case and the
 * platform routes it. Locally `.env.local` sets the variable, so every developer
 * and every test in this suite builds absolute URLs and never touches the rule.
 * It is dead configuration on every machine that could have noticed, and load
 * bearing on the one that could not.
 *
 * ⚠️ THE INVARIANT IS AGREEMENT BETWEEN TWO FILES, so that is what is asserted.
 * `.env` names the backend origin for a build that talks to it directly;
 * `vercel.json` names it for a build that goes through the rewrite. They are the
 * same backend. Two places holding one fact is this codebase's most repeated
 * defect -- `area_id`, `job_grades.description`, `Recruiter`/`Representative` --
 * and the answer each time was to make the second copy checkable rather than to
 * trust it.
 *
 * 📌 If `C7` is ever taken and the production URL leaves `.env`, this goes RED
 * rather than quietly passing. That is the intended outcome: the rewrite would
 * then be the only place naming the backend, and somebody should say so out
 * loud before it becomes true.
 */

/** `KEY=value` out of a dotenv file, ignoring comments and blank lines. */
function readEnvValue(path, key) {
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const equals = trimmed.indexOf('=')
    if (equals > 0 && trimmed.slice(0, equals).trim() === key) return trimmed.slice(equals + 1).trim()
  }
  return null
}

describe('the deployed client reaches the backend', () => {
  const rewrites = JSON.parse(readFileSync(join(REPO_ROOT, 'vercel.json'), 'utf8')).rewrites
  const apiRule = rewrites.find((rule) => rule.source.startsWith('/api/'))

  it('has an /api rewrite at all, ahead of the SPA fallback', () => {
    // Without this the two assertions below read `undefined` and would throw
    // rather than fail -- but more to the point, a MISSING rule is the same
    // outage as a wrong one: `/api/members` would fall through to the catch-all
    // and be answered with index.html, a 200 full of HTML that every caller
    // reports as a JSON parse error.
    expect(apiRule, 'vercel.json has no /api rewrite').toBeDefined()
    expect(
      rewrites.indexOf(apiRule),
      'the /(.*) fallback matches /api paths too, so it must come second',
    ).toBeLessThan(rewrites.findIndex((rule) => rule.source === '/(.*)'))
  })

  it('forwards the whole path, not just the prefix it matched', () => {
    expect(
      apiRule.destination,
      'the destination drops the captured path, so every endpoint becomes the ' +
        "backend's root -- add /api/$1",
    ).toContain('$1')
  })

  it('names the same backend origin that .env does', () => {
    const configured = readEnvValue(join(REPO_ROOT, '.env'), 'VITE_API_BASE_URL')
    // Non-vacuity: an unset or commented-out variable would make the comparison
    // below `undefined === undefined` on two unrelated things, and this test
    // would agree that nothing matches nothing.
    expect(configured, '.env names no VITE_API_BASE_URL to agree with').toBeTruthy()

    expect(new URL(apiRule.destination).origin, 'the rewrite and .env disagree about the backend').toBe(
      new URL(configured).origin,
    )
  })

  /**
   * 🔴 PROVE THE GUARD BY HANDING IT THE DEFECT.
   *
   * Every assertion above passes on the repaired file, and would also pass if
   * the parsing were broken in the direction that finds nothing. So: run the
   * two claims against the exact string that shipped, and require both to
   * reject it.
   */
  it('rejects the value that actually shipped', () => {
    const shipped = 'https://onrender.com'

    expect(shipped).not.toContain('$1')
    expect(new URL(shipped).origin).not.toBe(new URL(apiRule.destination).origin)
  })
})
