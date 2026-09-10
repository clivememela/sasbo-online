/**
 * The one overflow probe, and the one way to put the page into a theme. `05.1`.
 *
 * 🔴 WHY THIS FILE EXISTS: THREE COPIES HAD ALREADY DRIFTED. `matrix.mjs`,
 * `matrix-canary.mjs` and `states.mjs` each carried their own inlined `overflowProbe`, and
 * hashing the three bodies returned three different digests. The canary therefore proved a
 * probe that neither measuring tool actually ran — which is the arc's recurring species
 * wearing a new hat: an instrument that verifies something adjacent to the thing in use.
 * One copy, imported by all three, is the only version of this that stays true.
 */

/**
 * Every route the responsive tools sweep.
 *
 * 🔑 ONE LIST, IMPORTED. The matrix and the edge sweep must cover the same surface or the
 * pair proves less than either claims on its own — a route added to one and not the other
 * is a route whose ±1px behaviour nobody checked, reported inside a run that says "every
 * route". Kept here beside the probe so adding a route is one edit.
 */
export const ROUTES = [
  '/login', '/home', '/admin', '/admin/acb', '/admin/acb/debits', '/admin/daily-menu',
  '/admin/monthly-menu', '/admin/maintenance', '/admin/maintenance/recruitment-channel',
  '/admin/maintenance/subscriptions', '/recruiters', '/banks', '/banks/listing',
  '/members', '/members/apply', '/members/capture', '/members/recruiters',
  '/reports', '/reports/organizer-report', '/reports/forms', '/reports/locations',
  '/archives', '/archives/affiliations-other-trade-unions', '/archives/finance-houses',
  '/archives/research-information',
];

/**
 * What the page is wider than the REQUESTED viewport by, and which elements do it.
 *
 * 🔴 `requested` IS PASSED IN, NEVER READ FROM THE PAGE. The first version compared against
 * `window.innerWidth` and reported ZERO overflow across 350 route×width×theme combinations.
 * The zero was vacuous: under `Emulation.setDeviceMetricsOverride` with `mobile: true`,
 * Chrome applies the mobile shrink-to-fit rule, so a page wider than its viewport zooms out
 * and `innerWidth` grows to match the content. Measured with a 1200px element planted in a
 * viewport requested at 390: `scrollWidth` 1200, `innerWidth` 1200, offenders 0.
 * `scrollWidth > innerWidth` compares two numbers that move together and can never be true
 * on a phone-sized viewport — the only width anyone was worried about. [T25]
 *
 * 🔑 `innerWidth` is still reported, as EVIDENCE rather than as the yardstick: an
 * `innerWidth` that has drifted above `requested` is itself the symptom of shrink-to-fit.
 */
export const overflowProbe = (requested) => `(() => {
  const asked = ${requested};
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // Anything inside a horizontal scroller is allowed to be wider than the page: that is
    // what the scroller is FOR. Only an element that pushes the DOCUMENT wide counts.
    let scrolled = false;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden') { scrolled = true; break; }
    }
    if (scrolled) continue;
    if (r.right > asked + 1 || r.width > asked + 1) {
      const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\\s+/).slice(0, 3).join('.');
      offenders.push(Math.round(r.right) + 'px w=' + Math.round(r.width) + ' ' + el.tagName.toLowerCase() + (cls ? '.' + cls : ''));
    }
  }
  return {
    requested: asked,
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: offenders.slice(0, 10),
    offenderCount: offenders.length,
  };
})()`;

/**
 * Put the page into a theme — RUN THIS BEFORE NAVIGATING, NOT AFTER.
 *
 * 🔴 BOTH HARNESSES HAD THIS BACKWARDS AND HALF OF EVERY RUN WAS A DUPLICATE. They
 * navigated, waited for the body to have children, and then toggled `.dark` on
 * `documentElement`. But that wait is satisfied by the SPA shell — `<div id="root">` exists
 * in the served HTML — so the toggle landed before React mounted, and `ThemeContext`'s
 * mount effect then re-applied the class from ITS state, which is read from `localStorage`
 * and was still `false`. The class was set and then quietly unset a few milliseconds later.
 *
 * It was invisible because the tools reported combination COUNTS. The proof was in the
 * screenshots: all six light/dark pairs from the state harness were byte-identical.
 *
 * `index.html` carries a pre-paint script that reads `localStorage` and sets the class
 * before first paint, and `ThemeContext` seeds its state from the same key. So writing the
 * key and THEN navigating makes the theme correct from the first frame, with no race to
 * lose. The class toggle is kept as well, for the case where the caller is re-theming a
 * page it is not going to reload.
 */
export const storeTheme = (dark) => `(() => {
  try { localStorage.setItem('darkMode', ${dark ? "'true'" : "'false'"}) } catch { /* private mode */ }
  document.documentElement.classList.toggle('dark', ${dark});
  return true;
})()`;

/**
 * What theme the page is ACTUALLY in, read off the rendered result.
 *
 * Not `classList.contains('dark')` alone: the class is what we set, so asking for it back
 * proves only that the assignment happened. The computed background is what the stylesheet
 * did with it, which is the fact worth recording.
 */
export const themeReadout = `(() => {
  const body = getComputedStyle(document.body);
  const root = getComputedStyle(document.documentElement);
  const TRANSPARENT = 'rgba(0, 0, 0, 0)';
  return {
    dark: document.documentElement.classList.contains('dark'),
    // A transparent body means the stylesheet has not applied yet, or the ground is being
    // painted on the root instead. Falling through to the root keeps the reading honest in
    // both cases -- and if BOTH are transparent, the caller is reading too early, which is
    // itself worth seeing rather than papering over.
    bg: body.backgroundColor !== TRANSPARENT ? body.backgroundColor : root.backgroundColor,
    ink: body.color,
  };
})()`;

/**
 * The page is ready to be MEASURED — not merely ready to be looked at.
 *
 * 🔴 THE LAST CLAUSE IS THE ONE THAT WAS MISSING. Without it, one row of a 350-row matrix
 * (`/reports` at 1024, light) was measured with a transparent body — the stylesheet had not
 * applied yet. An unstyled page has an entirely different layout, so "no horizontal
 * overflow" on that row was a fact about a page nobody will ever see. One row in 350 is
 * exactly the rate at which a race gets rounded down to "clean" and never looked at again.
 */
export const pageReady = `(() => (
  document.fonts.status === 'loaded'
  && !document.querySelector('[data-testid="route-pending"]')
  && document.body.children.length > 0
  && getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)'
))()`;

/**
 * 🔑 THE THEME CANARY. Given every row a run produced, prove the two themes rendered
 * DIFFERENTLY. A run whose dark rows are pixel-identical to its light rows has measured one
 * theme twice and reported it as two, and every "× 2 themes" claim built on it is inflated.
 *
 * Returns a list of complaints; empty means the dimension is real.
 */
export function themeDimensionComplaints(rows) {
  const complaints = [];
  const light = rows.filter((r) => r.theme === 'light' && r.theme_bg);
  const dark = rows.filter((r) => r.theme === 'dark' && r.theme_bg);

  if (!light.length || !dark.length) {
    complaints.push('no theme readouts were recorded, so the theme dimension is unproven');
    return complaints;
  }
  // A transparent ground means the stylesheet had not applied when the row was measured,
  // so that row's layout — and therefore its overflow reading — is not the real page's.
  const unstyled = rows.filter((r) => r.theme_bg === 'rgba(0, 0, 0, 0)');
  if (unstyled.length) {
    complaints.push(
      `${unstyled.length} rows were measured before the stylesheet applied ` +
        `(${unstyled.slice(0, 3).map((r) => `${r.route ?? r.name}@${r.width ?? r.requested}`).join(', ')}` +
        `${unstyled.length > 3 ? ', …' : ''}) — their layout is not the real page's`,
    );
  }
  const wrongClass = dark.filter((r) => r.theme_dark !== true);
  if (wrongClass.length) {
    complaints.push(`${wrongClass.length} dark rows did not carry the .dark class`);
  }
  const lightBgs = new Set(light.map((r) => r.theme_bg));
  const darkBgs = new Set(dark.map((r) => r.theme_bg));
  const shared = [...darkBgs].filter((bg) => lightBgs.has(bg));
  if (shared.length) {
    complaints.push(
      `light and dark rendered the SAME body background (${shared.join(', ')}) — ` +
        'the dark half of this run measured the light page',
    );
  }
  return complaints;
}
