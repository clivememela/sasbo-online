import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * THE REGISTER'S CARD ROWS ARE WRITTEN TWICE, AND HELD IDENTICAL HERE. `06.3`.
 *
 * `index.css` carries the phone's arrangement of the register under two conditions: a viewport
 * of 760px or less, and a register narrower than its three essential columns -- which, on a
 * desktop, only enlarged text produces (at a 125% root font with a record docked at 1280, Status
 * was cut by 162px). CSS has no way to say "@media or @container" once, so the rules are written
 * under both. Two copies drift the day one of them is edited, and the one that drifts is the
 * one nobody looks at. This fails that day.
 */

const CSS = readFileSync(new URL('../assets/styles/index.css', import.meta.url), 'utf8')

export const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Declarations only, whitespace collapsed -- so a comment or a line break is not a difference. */
export const normalise = (body) => body.replace(/\s+/g, ' ').trim()

/**
 * The body of the first at-rule whose prelude begins with `prelude` and whose body contains
 * `mustContain`. The prelude is a prefix on purpose: index.css also has
 * `@media (max-width: 760px), (pointer: coarse)` blocks, and those must be skipped by their
 * content rather than by a spelling that would break on the next edit to either.
 */
export function atRuleBody(css, prelude, mustContain) {
  let from = 0
  for (;;) {
    const start = css.indexOf(prelude, from)
    if (start === -1) return null
    const open = css.indexOf('{', start)
    let depth = 0
    for (let i = open; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1
      else if (css[i] === '}') {
        depth -= 1
        if (depth === 0) {
          const body = css.slice(open + 1, i)
          if (body.includes(mustContain)) return body
          break
        }
      }
    }
    from = start + prelude.length
  }
}

const PHONE = '@media (max-width: 760px)'
const NARROW = '@container register (max-width: 33rem)'
const bodyOf = (css, prelude) => {
  const body = atRuleBody(stripComments(css), prelude, '.register thead')
  return body === null ? null : normalise(body)
}

describe("the register's card rows", () => {
  it('the comparison convicts a drifted copy, and acquits one that differs only in comments and spacing', () => {
    const phone = `${PHONE} { .register thead { position: absolute; } .register tr[data-row] { gap: 1px 12px; } }`
    const drifted = `${NARROW} { .register thead { position: absolute; } .register tr[data-row] { gap: 2px 12px; } }`
    const respaced = `${NARROW} {\n  /* the same rules */\n  .register thead { position: absolute; }\n  .register tr[data-row] {   gap: 1px 12px; }\n}`
    // A block that is not the register's must be stepped over, not compared.
    const decoy = `${PHONE}, (pointer: coarse) { .search-text { font-size: 16px; } }\n${phone}`

    expect(bodyOf(drifted, NARROW)).not.toBe(bodyOf(phone, PHONE))
    expect(bodyOf(respaced, NARROW)).toBe(bodyOf(phone, PHONE))
    expect(bodyOf(decoy, PHONE)).toBe(bodyOf(phone, PHONE))
  })

  it('the phone block and the narrow-register block hold the same rules', () => {
    const phone = bodyOf(CSS, PHONE)
    const narrow = bodyOf(CSS, NARROW)

    expect(phone, 'the phone register block is gone or renamed, so there is nothing to compare').not.toBeNull()
    expect(narrow, 'the narrow-register block is gone: enlarged text would cut Status off again').not.toBeNull()
    expect(narrow, 'the two card-row blocks have drifted apart: edit both, or neither').toBe(phone)
  })
})
