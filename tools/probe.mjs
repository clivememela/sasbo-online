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
  // 🔑 ONE STYLE RESOLUTION PER ANCESTOR, NOT ONE PER DESCENDANT-ANCESTOR PAIR. Every element
  // walks its ancestor chain asking the same question of the same parents, so on /members
  // (~1,000 elements under #root, ~700 of them table cells) the TableScroller div alone was
  // asked ~700 times and each shell container hundreds. Measured shape: ~5,500 forced style
  // resolutions where at most ~300 distinct ancestors exist -- and this probe runs ~700 times
  // across a full sweep, on a box that has been under 1.5 GB free.
  //
  // ⚠️ IT MEMOISES ONLY, AND THAT IS DELIBERATE. The walk order, the \`p !== document.body\`
  // stop and the early \`break\` are untouched, so the "inside a horizontal scroller is
  // allowed" rule is character-for-character the rule it was. A faster top-down pass exists
  // and would RESTATE that rule rather than cache it, which is the trade this file does not
  // make -- see this module's header on three copies of one probe drifting apart.
  const overflowX = new Map();
  const overflowXOf = (p) => {
    let v = overflowX.get(p);
    if (v === undefined) { v = getComputedStyle(p).overflowX; overflowX.set(p, v); }
    return v;
  };
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // Anything inside a horizontal scroller is allowed to be wider than the page: that is
    // what the scroller is FOR. Only an element that pushes the DOCUMENT wide counts.
    let scrolled = false;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = overflowXOf(p);
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
    // 🔑 THE POPULATION TRAVELS WITH THE VERDICT, ALWAYS. "This page does not overflow" and
    // "this page is empty" are the same sentence otherwise, and an empty page is the most
    // reliably non-overflowing page there is. Carrying the count means every consumer can
    // tell a clean measurement from a vacuous one WITHOUT having to remember to ask -- which
    // is the whole reason \`edges.mjs\` reported 25 clean forced-colors rows over three blank
    // pages: nothing in the row said how much page there had been.
    elements: document.querySelectorAll('#root *').length,
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
 * 🔴 EVERY CLAUSE HERE IS A ROW THAT WAS MEASURED BEFORE ITS PAGE EXISTED. The stylesheet
 * clause came first: without it one row of a 350-row matrix (`/reports` at 1024, light) was
 * measured with a transparent body, and an unstyled page has an entirely different layout, so
 * that row's "no horizontal overflow" was a fact about a page nobody will ever see.
 *
 * 🔴 AND THEN THE `#root` CLAUSE, WHICH IS THE ONE THAT MATTERED MOST. Measured 2026-09-10:
 * `edges.mjs`'s forced-colors sweep reported **0 visible controls across all 25 routes**, and
 * the cause was that all four of the ORIGINAL clauses are satisfied by a page where **React
 * has not mounted at all**:
 *
 *   fonts loaded                   ✓ nothing has asked for a font yet
 *   no `route-pending` element     ✓ — AND THIS CLAUSE WAS WORSE THAN USELESS. Before React
 *                                    mounts there is no Suspense fallback EITHER, so the
 *                                    absence of the pending marker reads as "arrived" when it
 *                                    actually means "has not started".
 *   body has children              ✓ `<div id="root">` is in the served HTML
 *   body background is painted     ✓ index.html's pre-paint script and the CSS do that before
 *                                    a single component renders
 *
 * Confirmed by census: `{"matched":0,"rootKids":0,"firstBox":"none"}` on `/login`, `/home` and
 * `/admin` while `pageReady` returned `true` and the harness reported `landed=true`. The fourth
 * route onward worked, because by then the chunks were cached — **so this failure is a COLD
 * CACHE failure, which is why it hid**: any tool that happened to warm the browser first, or
 * that slept after landing, saw a populated page and agreed the predicate was fine.
 *
 * 🔑 THE CLAUSE IS `#root` HAVING CHILDREN, i.e. the application has rendered something. It is
 * the only one of the five that cannot be satisfied by the empty shell, and it is deliberately
 * a floor on the APP rather than on any one route's content — a per-route selector would be a
 * second thing to keep in step with 25 routes.
 */
/*
 * 🔴 AND EVERY CLAUSE IS NULL-SAFE, BECAUSE MID-NAVIGATION THERE IS NO `document.body`.
 *
 * `document.body.children.length` and `getComputedStyle(document.body)` both THROW on a document
 * that has not built its body yet — which is the state a poll started immediately after
 * `Page.navigate` can catch. This was latent from the day the predicate was written and invisible
 * because the old hand-copied `evaluate()` in four of six tools SWALLOWED page exceptions and
 * returned `undefined`, which the readiness loops read as "not ready yet" and simply retried.
 *
 * 🔑 THE STRICT `evaluate` IN `cdp.mjs` FOUND IT WITHIN ONE RUN. Once a thrown expression became
 * a real error instead of a silent `undefined`, `edges` and `contrast` both aborted with
 * `Cannot read properties of null (reading 'children')` — the fifth defect the refactor pass
 * turned up, and the clearest possible argument for having stopped swallowing exceptions.
 */
export const pageReady = `(() => (
  document.fonts.status === 'loaded'
  && !document.querySelector('[data-testid="route-pending"]')
  && (document.body?.children.length ?? 0) > 0
  && (document.getElementById('root')?.children.length ?? 0) > 0
  && (document.body ? getComputedStyle(document.body).backgroundColor : 'rgba(0, 0, 0, 0)') !== 'rgba(0, 0, 0, 0)'
))()`;

/** Where a row was taken, for a complaint message. Rows are shaped differently per tool. */
const rowWhere = (r) => `${r.route ?? r.name ?? '?'}@${r.width ?? r.requested ?? '?'}`;

/**
 * 🔑 THE PAGE-POPULATION CANARY. Given every row a run produced, complain about any that was
 * taken against a page with almost nothing in it.
 *
 * A row with 3 elements under `#root` is not evidence about a layout; it is evidence that the
 * tool measured before the application rendered. `edges.mjs` shipped 25 such rows and called
 * them clean, and nothing in its output could have shown that — see `pageReady` above for the
 * five conditions a bare SPA shell satisfies.
 *
 * The floor is deliberately LOW (a non-vacuity canary, not a coverage target — the same rule
 * `src/test/floors.js` states for the suite's own floors). The lightest real route in this
 * application renders 11 elements at its emptiest, so 8 separates "a page" from "no page"
 * without reddening for a route that is legitimately sparse.
 *
 * 🔴 A ROW WITH NO `elements` FIELD IS A COMPLAINT, NOT A SKIP — AND THE FIRST VERSION HAD
 * THAT BACKWARDS. It read `typeof r.elements === 'number' && r.elements < floor`, so a row
 * that never carried the field simply fell out of the filter and the run came back clean.
 * Two live cases, both in the commit that introduced this function: `contrast.mjs`, whose rows
 * come from axe and never touch `overflowProbe`, and `states.mjs`'s never-ready path, which
 * hand-built a row listing eight fields and omitted this one. **The vacuity checker was
 * itself vacuous**, which is the exact species it exists to catch, one level up.
 */
export function populationComplaints(rows, floor = 8) {
  const complaints = [];

  const missing = rows.filter((r) => typeof r.elements !== 'number');
  if (missing.length) {
    complaints.push(
      `${missing.length} of ${rows.length} rows carry no \`elements\` count ` +
        `(${missing.slice(0, 5).map(rowWhere).join(', ')}${missing.length > 5 ? ', …' : ''}), so ` +
        `this canary cannot tell whether they were measured against a real page. Give the row ` +
        `an element census — do NOT let it fall out of the check, which is how the check ` +
        `becomes the thing it was written to catch.`,
    );
  }

  const empty = rows.filter((r) => typeof r.elements === 'number' && r.elements < floor);
  if (empty.length) {
    complaints.push(
      `${empty.length} of ${rows.length} rows were measured against a page with fewer than ` +
        `${floor} elements under #root (${empty.slice(0, 5).map((r) => `${rowWhere(r)}=${r.elements}`).join(', ')}` +
        `${empty.length > 5 ? ', …' : ''}) — the application had not rendered, so those rows are ` +
        `facts about a blank page. An empty page never overflows.`,
    );
  }

  return complaints;
}

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
