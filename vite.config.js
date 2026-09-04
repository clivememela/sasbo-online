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
