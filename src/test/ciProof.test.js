// SCRATCH, NEVER MERGED: the reddening proof R1-1 for this repository's CI. A deliberately failing test, so the `gate`
// job must go red with this test named in its log, and the JUnit report must still upload (R1-5). The pull request
// carrying it is a draft, closed unmerged, and its branch is deleted.
import { describe, expect, it } from 'vitest'

describe('SCRATCH R1-1: the CI gate goes red on a failing test', () => {
  it('fails on purpose, so the gate must go red and name this test', () => {
    expect(1 + 1).toBe(3)
  })
})
