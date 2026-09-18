import { describe, expect, it } from 'vitest'

import {
  assertDetectorCanary,
  assertScanIsHonest,
  FLOORS,
} from './assertNonVacuousScan.js'
import { nonTestSources } from './sourceScan.js'

/**
 * No native `<input type="date">` in `src`. `10.4`, and §5's `DATE_INPUTS` ceiling.
 *
 * 🔴 THE COUNT WAS 10 WHEN THIS ARC OPENED AND IS 0 TODAY. `03.3` replaced every one with
 * `DateField`, and the owner's own ruling is the reason the replacement is not optional: the
 * date field is CHOOSE-ONLY. A native date input is a different control on every browser and
 * platform, it cannot be themed, its format follows the operating system's locale rather than
 * the register's (`yyyy/mm/dd`), and on a phone it opens a picker nobody can style. This guard
 * is what stops the eleventh appearing.
 *
 * ⚠️ AND IT IS AIMED AT THE ELEMENT, NOT AT THE STRING `type="date"`, which is the whole
 * difficulty. `type="date"` is LIVE AND CORRECT in five places -- `<Field type="date">` in
 * `OrganizerReport.jsx` and `CaptureMember.jsx` -- because `Field` ROUTES that kind to
 * `DateField` rather than to a bare input (`fieldKinds.js:96`: *"Dates go through DateField
 * (03.3), never a bare input"*). A guard aimed at the spelling would convict the five call
 * sites that are doing the right thing, and the only way past it would be to stop writing
 * `type="date"` at all -- which would delete the routing this rule exists to enforce. That is
 * a guard that cries wolf, and a guard that cries wolf gets switched off.
 *
 * 🔑 SO THE WINDOW ENDS AT THE NEXT `<`, NOT AT THE NEXT `>`. The obvious predicate --
 * `<input[^>]*type="date"` -- is wrong in this codebase and silently so: a JSX handler prop
 * contains `=>`, so `[^>]*` stops dead at the arrow and never reaches the attribute. Every
 * multi-line input with an `onChange` would be invisible to it, which is most of them. The
 * scan therefore reads forward from `<input` to the start of the next element and looks for
 * the attribute there.
 *
 * COMMENTS ARE BLANKED, and this guard needs it as much as its neighbour: six sites carry
 * `<input type="date">` in PROSE, recording what was removed (`DateField.jsx:71`,
 * `Members.jsx`, `OrganizerReport.jsx:53`). A scan that read them would convict the
 * documentation of the fix -- [F-P29] exactly.
 *
 * 📍 MEASURED 2026-09-18: `src` contains no `<input type={...}>` with a computed type at all,
 * so this scan is not blind in that direction today. If one is ever written, this guard cannot
 * see it and the honest move is to say so here rather than to trust the green.
 */

/**
 * The native temporal input types. `time` is deliberately absent: the register captures no
 * times, so a ceiling on it would guard a population that does not exist -- and a guard with
 * no possible subject is a guard nobody maintains.
 */
const NATIVE_DATE_TYPE = /\btype\s*=\s*(?:["']|\{\s*["'])(date|datetime-local|month|week)\b/

function detect(sample) {
  const hits = []
  for (const opening of sample.matchAll(/<input\b/g)) {
    const after = sample.slice(opening.index + opening[0].length, opening.index + 600)
    // The attribute list ends where the next element begins. See the header: `>` cannot be
    // the delimiter, because `onChange={(e) => ...}` contains one.
    const nextElement = after.indexOf('<')
    const attributes = nextElement === -1 ? after : after.slice(0, nextElement)
    const found = attributes.match(NATIVE_DATE_TYPE)
    if (found) hits.push(`<input ... type="${found[1]}"`)
  }
  return hits
}

const CANARY = {
  mustConvict: [
    '<input type="date" />',
    '<input type="datetime-local" />',
    "<input type='month' />",
    '<input className="w-full" type="week" value={v} />',
    '<input type={"date"} />',
    // 🔴 THE ONE THAT BROKE THE OBVIOUS PREDICATE. The handler's `=>` sits between the tag
    // and the attribute, so anything bounded by `[^>]` stops before it ever gets there.
    '<input\n  id="joined"\n  onChange={(e) => setJoinDate(e.target.value)}\n  type="date"\n/>',
    '<input onBlur={() => touch()} type="date" className="x" />',
  ],
  mustAcquit: [
    // 🔑 THE FIVE LIVE CALL SITES' SHAPE. `Field` routes the kind to `DateField`.
    '<Field label="Date of Visit" name="dateOfVisit" type="date" />',
    '<Field label="Date Joined" value={form.joinDate} type="date" disabled />',
    '<DateField value={value} onChange={onChange} />',
    // Ordinary inputs, including ones whose neighbours are dates.
    '<input type="text" />',
    '<input type="checkbox" checked={on} />',
    '<input type="number" inputMode="numeric" />',
    '<input onChange={(e) => setDateOfBirth(e.target.value)} type="text" />',
    'const dateType = "date"',
    'type: "date",',
    // 🔴 THE WINDOW MUST CLOSE AT THE NEXT ELEMENT. Without that, this ordinary text input
    // borrows the `type="date"` of the `<Field>` that follows it and is convicted for its
    // neighbour's attribute.
    '<input type="text" />\n<Field name="joined" type="date" />',
  ],
}

describe('no native date inputs in src', () => {
  it('the detector sees a native date input and acquits every Field that routes to DateField', () => {
    assertDetectorCanary(CANARY, detect, 'native-date-input')
  })

  it('no source file renders one', () => {
    // `.jsx` only: a native element can only be written in JSX, and this is the population
    // `SRC_JSX_FILES` was measured against. Borrowing `SRC_SOURCE_FILES` (measured against a
    // larger set) would leave headroom this walk was never calibrated for, and headroom is
    // silence in the amount of the headroom.
    const sources = nonTestSources({ pattern: /\.jsx$/ })

    assertScanIsHonest(sources, FLOORS.SRC_JSX_FILES, 'the native-date-input scan')

    const offenders = sources.flatMap((source) =>
      detect(source.code).map((hit) => `${source.path} ${hit}`),
    )

    expect(
      offenders,
      'A native date input is back in `src`. It is a different control on every browser, it ' +
        'cannot be themed, and it shows the operating system\'s date format rather than the ' +
        "register's `yyyy/mm/dd`. The owner's ruling is that the date field is CHOOSE-ONLY: " +
        'use `DateField`, or `<Field type="date">`, which routes to it (`fieldKinds.js`).',
    ).toEqual([])
  })
})
