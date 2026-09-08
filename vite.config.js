import process from 'node:process'
import { availableParallelism } from 'node:os'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The test run is HOSTILE ORDER by default: files and tests are shuffled so that
// nothing may depend on the order it happens to be written in. A shuffle you
// cannot replay is a flake report with no repro, so the seed is chosen here,
// printed once at startup, and overridable with VITEST_SEED to reproduce a run.
const isVitest =
  process.env.VITEST === 'true' || process.argv.some((a) => a.includes('vitest'))

const seed = Number(process.env.VITEST_SEED) || (Date.now() % 2147483647)

// The worker cap, derived rather than written out -- see `poolOptions` below
// for what it defends against. Never more workers than the host has cores, and
// never more than four, whichever is smaller.
const MAX_FORKS = Number(process.env.VITEST_MAX_FORKS) || Math.min(4, availableParallelism())

if (isVitest) {
  console.log(
    `\n  vitest sequence.seed=${seed}  (replay with VITEST_SEED=${seed})` +
      `\n  vitest maxForks=${MAX_FORKS}  (override with VITEST_MAX_FORKS)\n`,
  )
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Everything below is read by Vitest only. `vite build` ignores the `test`
  // key entirely -- proven in this phase by running `npm run build` and
  // `npm run lint` against this file, because it is the one file where a test
  // change could break the shipped product.
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,

    // THE SUITE SUPPLIES ITS OWN CONFIGURATION, AND NEVER INHERITS ONE.
    //
    // `client/.env` is COMMITTED and points VITE_API_BASE_URL at the deployed
    // backend. Without this block every test run silently picked that up, and
    // two consequences followed:
    //
    //   1. The tests were exercising an absolute-URL configuration by
    //      accident. Two files had already been caught asserting against it
    //      (api.test.js), and the rest were relying on it without saying so.
    //   2. The `@vitest-environment node` files DEPENDED on it. Node's fetch
    //      refuses a relative URL, so with .env moved aside -- the
    //      CI-readiness proof -- 72 tests failed at once. A fresh clone does
    //      have .env, since it is tracked, so this would never have shown up
    //      as a CI failure. It would have shown up the day someone finally
    //      untracked that file, which is a change nobody would connect to a
    //      test suite.
    //
    // A fixed, obviously-fake origin removes both. Tests that care about the
    // base URL stub it explicitly and re-import the module; nothing else has
    // to think about it, and no test result depends on a developer's local
    // environment or on a file that ought not to be committed.
    env: {
      VITE_API_BASE_URL: 'http://api.test.invalid',
      VITE_GOOGLE_API_KEY: '',
    },

    // Co-located `*.test.js(x)` beside the unit under test. Stated explicitly
    // rather than inherited from the default, so that breaking this glob is a
    // runnable reddening change.
    //
    // `scripts/` is in scope as well as `src/`. The guards there run OUTSIDE
    // the suite -- they assert its exit code and its total, which nothing
    // inside a short run can do -- but the logic they are built from is
    // ordinary code and was the only unguarded code in the repository. It is
    // tested here, in the suite, like everything else. See
    // `scripts/junitCounts.test.js`.
    include: ['src/**/*.test.{js,jsx}', 'scripts/**/*.test.{js,jsx}'],
    exclude: ['node_modules/**', 'dist/**'],

    sequence: {
      shuffle: true,
      seed,
    },

    // Zero, explicitly, so that nobody raises it "just for CI" later. A retry
    // is a flake hidden rather than fixed.
    retry: 0,

    // The PER-TEST deadline -- not the suite's performance budget, which is
    // recorded in src/test/README.md.
    //
    // Measured 2026-09-05: CaptureMember is an 858-line component that
    // re-renders on every keystroke, and its round-trip cases cost ~2.4s each
    // when their file runs alone and ~5.7s when another file runs beside them.
    // Against Vitest's 5s default that is a test whose result depends on how
    // busy the machine is -- the defining shape of a flake, and it was
    // observed as one before it was fixed.
    //
    // The design was fixed first: src/test/user.js removes userEvent's
    // artificial inter-keystroke delay for the whole suite, and the pure test
    // files declare `@vitest-environment node` so no jsdom is built for them.
    // What remains is the component's real cost, and this deadline sits well
    // above the worst observed figure rather than just above it, so a loaded
    // runner has room. Nothing is retried and nothing is skipped for slowness.
    testTimeout: 20_000,

    // 🔴 A BOUNDED WORKER POOL, and this is the fix for a failure that has
    // already happened here once -- register row F11.
    //
    // What F11 was: this suite reported "336 tests, 6 failed" against a true
    // total of 398. SIXTY-TWO TESTS NEVER RAN. Six Vitest worker processes
    // failed to start under host memory pressure, and the report presented
    // that as six ordinary failures.
    //
    // 🔑 The dangerous half is not the red -- it is that the 62 missing tests
    // were invisible in the count. Under the same conditions a run whose
    // remaining tests all passed would have said "336 passed", and nobody
    // would have looked at all.
    //
    // Unset, Vitest sizes its pool from the host's CPU count and a starved box
    // is free to try to start workers it cannot afford. Capping it converts
    // that failure from ABSENT into SLOW, which is the trade worth making: a
    // slow suite is visible and a short one is not. Four is well below this
    // box's core count and comfortably above one, so the suite still
    // parallelises.
    //
    // ⚠️ The cap is half the fix. The other half is outside the suite --
    // `scripts/suite-floor.mjs` asserts the total and the exit code, because
    // nothing running INSIDE a short run can notice that it was short.
    //
    // 🔑 DERIVED, NOT A CONSTANT. A bare `4` is a fact about one developer's
    // machine committed into shared config: a no-op on a 2-core CI runner and a
    // 16x throttle on a 64-core one, neither of which anybody chose. `min(4,
    // availableParallelism())` never asks for more workers than the host has,
    // and `VITEST_MAX_FORKS` lets a host that knows better say so -- the same
    // pick-a-value / allow-an-override / print-it shape `VITEST_SEED` uses
    // above, so the run's own log records what it actually used.
    //
    // 🔴 `maxWorkers`, TOP-LEVEL. This was first written as
    // `poolOptions.forks.maxForks`, which is the Vitest 3 spelling -- and this
    // project is on Vitest 5, where `test.poolOptions` was REMOVED. It was
    // accepted silently, warned about once in a wall of startup output, and
    // capped nothing at all.
    //
    // 🔑 That is worth leaving written down, because it is this finding's own
    // failure mode happening to its own fix: a mitigation that is present in
    // the config, reads correctly, and does nothing. The only reason it was
    // caught is that the run was watched rather than assumed.
    //
    // `pool` is stated rather than inherited for the reason the `include` glob
    // is -- so that a changed default is a reddening change and not a silent
    // one.
    pool: 'forks',
    maxWorkers: MAX_FORKS,

    reporters: ['default', 'junit'],
    outputFile: {
      junit: 'reports/junit.xml',
    },

    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'src/services/**/*.js',
        'src/utils/**/*.js',
        'src/hooks/**/*.js',
        'src/context/**/*.{js,jsx}',
      ],
      thresholds: {
        // The pure, high-risk layer earns the higher bar.
        'src/utils/**': { lines: 90, statements: 90, functions: 90, branches: 90 },
        'src/services/**': { lines: 70, statements: 70, functions: 70, branches: 70 },
      },
    },
  },
})
