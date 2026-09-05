import process from 'node:process'
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

if (isVitest) {
  console.log(`\n  vitest sequence.seed=${seed}  (replay with VITEST_SEED=${seed})\n`)
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
    include: ['src/**/*.test.{js,jsx}'],
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
