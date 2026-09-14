/**
 * MOTION, MEASURED IN A BROWSER THAT HAS BEEN ASKED FOR LESS OF IT. `06.2`.
 *
 * P6's Definition of Done says `prefers-reduced-motion` is *"verified BY TOGGLING it"*, and the
 * emphasis is the whole instruction. There are three cheaper things that all look like
 * verification and are not:
 *
 *   ① GREPPING FOR `motion-reduce:` — counts utilities, not behaviour, and says nothing at all
 *      about the 38 animated elements that never got one.
 *   ② ASSERTING THE MEDIA QUERY MATCHES — `matchMedia('(prefers-reduced-motion: reduce)').matches`
 *      being `true` proves the emulation worked, which is a fact about Chrome. `edges.mjs` says
 *      the same thing about `forced-colors` in its own words: making a query MATCH is not the
 *      same as observing what happens because it did.
 *   ③ READING THE STYLESHEET BACK — the rule is there, therefore it works. It is a rule with a
 *      selector, a cascade and a specificity fight against 45 utility classes, and this arc has
 *      already found one lint rule (`05.4`) and one abort guard (`06.1b`) that were present,
 *      correct-looking and dead.
 *
 * 🔑 SO IT MEASURES THE ONE THING THAT CANNOT BE FAKED: **what the browser says it will
 * interpolate**, read off `getComputedStyle().transitionProperty` on the real elements, under
 * both settings, on the built client.
 *
 * ---
 *
 * 🔴 WHAT IT IS LOOKING FOR, AND WHY IT IS NOT "NOTHING MOVES".
 *
 * The ratified posture (`directionContract.md` → *Motion posture*) is specific:
 *
 *     "`prefers-reduced-motion` keeps opacity and state and drops every spatial move."
 *
 * So this asserts BOTH halves, and the second is the one that catches the reflex fix. The
 * well-known snippet — `transition-duration: 0.01ms !important` on everything — passes any
 * check that only looks for movement stopping, and it violates the posture: it also kills the
 * colour and opacity transitions that a user who asked for less motion still has as feedback.
 * A run where NOTHING transitions is a failure here, not a pass.
 *
 * ⚠️ AND IT PROVES ITS OWN INSTRUMENT FIRST (T1). Before trusting a clean reduced-motion run it
 * takes the same reading with the emulation OFF and requires the two to DIFFER. If they do not,
 * the emulation did not land, or the probe is reading a property that never had a spatial value
 * — either way the "clean" result is about nothing. `matrix.mjs` ran clean and half-blind for a
 * whole phase on exactly that shape.
 *
 *   node tools/motion.mjs <baseUrl>
 */
import { launch } from './cdp.mjs';

import { ROUTES, SETTLED, pageReady, routeComplaints, storeTheme } from './probe.mjs';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4319';

/**
 * The properties whose animation is a SPATIAL move, and the ones that are not.
 *
 * 🔑 `box-shadow` IS ON THE KEEP SIDE AND IT IS THE ONLY DEBATABLE ONE. It is how this design
 * says "raised" — `NavigationCard` lifts on hover — and it moves nothing: no layout, no
 * position, no apparent displacement of the element itself. Vestibular guidance is about motion
 * in the visual field, not about depth cues.
 */
const SPATIAL = ['transform', 'translate', 'rotate', 'scale', 'top', 'left', 'right', 'bottom',
  'width', 'height', 'margin', 'padding', 'inset'];
const KEPT = ['opacity', 'color', 'background-color', 'border-color', 'box-shadow', 'fill', 'stroke'];

/**
 * Read every visible element and say what it would animate.
 *
 * Reports the POPULATION alongside the verdict, because "0 spatial transitions" and "the
 * selector matched nothing" print identically — the failure mode this whole tool family exists
 * to refuse.
 */
const motionCensus = `(() => {
  const spatial = ${JSON.stringify(SPATIAL)};
  const kept = ${JSON.stringify(KEPT)};

  let examined = 0;
  let animating = 0;
  const spatialSites = [];
  let spatialCount = 0;
  let keptSites = 0;
  let runningAnimations = 0;
  let overBudget = 0;
  const slowSites = [];

  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // Counted BEFORE the duration gate: this is the population the claim is over, and a
    // number without its population is the thing this arc keeps being caught by.
    examined += 1;

    const s = getComputedStyle(el);

    // 🔴 THE DURATION GATE, AND THE FIRST RUN OF THIS TOOL IS WHY IT IS HERE.
    //
    // \`transition-property\` DEFAULTS TO \`all\` in the computed style, on every element in
    // the document, whether or not anything was ever authored. Without this gate the first
    // pass reported 5,786 "spatial transitions" across 25 routes -- which is not a
    // measurement of this design, it is a measurement of a CSS default. The reduced pass
    // then read 0 and the tool printed a confident, meaningless success.
    //
    // An element only animates if it has BOTH a property and a non-zero duration. Reading
    // the property alone answers "what WOULD interpolate if a duration were set", which is
    // a different question and the flattering one.
    const durations = (s.transitionDuration || '').split(',').map((d) => parseFloat(d) || 0);
    const runs = durations.some((d) => d > 0);
    if (!runs) continue;

    // The BUDGET, from P6's invariants: under 200ms for state feedback, under 400ms for
    // anything larger. Recorded per element rather than asserted, because the two authored
    // exceptions (the 580ms card and the 1200ms theme pour) are allowed to exceed it and the
    // tool has no way to know which element it is looking at -- the JUDGEMENT stays with a
    // reader, and what the tool owes them is the list.
    const longest = Math.max(...durations, 0) * 1000;
    if (longest > 400) {
      overBudget += 1;
      const name = el.tagName.toLowerCase() +
        (typeof el.className === 'string' && el.className ? '.' + el.className.split(/\s+/)[0] : '');
      if (slowSites.length < 8) slowSites.push(name + ' ' + Math.round(longest) + 'ms');
    }

    // \`transitionProperty\` is what the browser will interpolate. \`none\` means it will not,
    // whatever the duration says -- which is exactly what the narrowed rule produces for a
    // transform, and is why the property is read as well as the duration.
    const props = (s.transitionProperty || '').split(',').map((p) => p.trim()).filter(Boolean);
    const live = props.filter((p) => p !== 'none');
    if (live.length) animating += 1;

    // \`all\` is the interesting case: it means EVERY property, spatial ones included, so a
    // narrowing that leaves \`all\` in place has not narrowed anything.
    const movesSpatially = live.some((p) => p === 'all' || spatial.includes(p));
    if (movesSpatially) {
      spatialCount += 1;
      const name = el.tagName.toLowerCase() +
        (typeof el.className === 'string' && el.className ? '.' + el.className.split(/\\s+/)[0] : '');
      if (spatialSites.length < 6) spatialSites.push(name + ' [' + live.join(' ') + ']');
    }
    if (live.some((p) => p === 'all' || kept.includes(p))) keptSites += 1;

    // A keyframe animation still cycling. \`animate-spin\` is the common one -- and a
    // reduced-motion setting must leave the LOADING STATE announced even when the spinner has
    // stopped, which is \`DataState\`'s \`role="status"\` and not this tool's business.
    if (s.animationName && s.animationName !== 'none') {
      const secs = parseFloat(s.animationDuration) || 0;
      if (secs > 0.001) runningAnimations += 1;
    }
  }

  return { examined, animating, spatialCount, spatialSites, keptSites, runningAnimations, overBudget, slowSites };
})()`;

let cdp;
let failures = 0;
let missed = 0;

try {
  cdp = await launch('motion');
  const { send, evaluate, metrics, waitFor, assertBuiltClient } = cdp;

  console.log('identity OK — entry script', await assertBuiltClient(baseUrl));

  const land = async (route) => {
    await send('Page.navigate', { url: baseUrl + route });
    return waitFor(pageReady);
  };

  await metrics(1024);
  await land('/');
  await evaluate(storeTheme(false));

  /** One pass over every route, with the emulation in a given state. */
  const pass = async (label, reduce) => {
    await send('Emulation.setEmulatedMedia', {
      features: reduce ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [],
    });

    const totals = { examined: 0, animating: 0, spatial: 0, kept: 0, running: 0, overBudget: 0 };
    const offenders = [];
    const slow = [];

    for (const route of ROUTES) {
      if (!await land(route)) { missed += 1; continue; }
      // Entrance transitions settle before anything is read (T4/T5): a value read
      // mid-transition is whatever it happened to be passing through. A condition, not the
      // fixed 150ms this was.
      if (!await waitFor(SETTLED, { tries: 120, awaitPromise: true })) { missed += 1; continue; }

      const c = await evaluate(motionCensus);
      totals.examined += c.examined;
      totals.animating += c.animating;
      totals.spatial += c.spatialCount;
      totals.kept += c.keptSites;
      totals.running += c.runningAnimations;
      totals.overBudget += c.overBudget;
      if (reduce && c.spatialCount) offenders.push(`${route}: ${c.spatialSites.join(' · ')}`);
      if (!reduce && c.overBudget) slow.push(`${route}: ${c.slowSites.join(' · ')}`);
    }

    console.log(`\n${label}`);
    console.log(`  ${ROUTES.length} routes · ${totals.examined} visible elements examined`);
    console.log(`  transitioning ${totals.animating} · spatial ${totals.spatial} · non-spatial ${totals.kept} · animations running ${totals.running}`);
    if (!reduce) {
      console.log(`  over the 400ms budget: ${totals.overBudget}`);
      for (const line of slow.slice(0, 10)) console.log(`    ${line}`);
    }
    for (const line of offenders.slice(0, 10)) console.log(`    ${line}`);

    return totals;
  };

  const normal = await pass('① emulation OFF — the baseline this arc actually ships', false);
  const reduced = await pass('② prefers-reduced-motion: reduce — TOGGLED, not assumed', true);

  await send('Emulation.setEmulatedMedia', { features: [] });

  console.log('\n─── verdict ───');

  // ⚠️ THE INSTRUMENT FIRST (T1). A clean run means nothing until the two passes differ.
  if (normal.spatial === 0) {
    console.log('  ✗ VACUOUS: the baseline pass found NO spatial transitions either, so the');
    console.log('    clean reduced-motion result below is about nothing. Either the emulation');
    console.log('    leaked into pass ①, or the census reads a property that never carried a');
    console.log('    spatial value. Fix the probe before trusting the number.');
    failures += 1;
  } else {
    console.log(`  ✓ the passes differ: ${normal.spatial} spatial transitions normally, ${reduced.spatial} under reduce`);
  }

  // ① every spatial move is dropped.
  if (reduced.spatial > 0) {
    console.log(`  ✗ ${reduced.spatial} elements would still animate a SPATIAL property under reduce`);
    failures += 1;
  } else {
    console.log('  ✓ no spatial transition survives the setting');
  }

  // ② and the non-spatial ones are KEPT — the half a blanket rule fails.
  if (reduced.kept === 0) {
    console.log('  ✗ NOTHING transitions under reduce, including colour and opacity. That is the');
    console.log('    blanket `transition: none` fix, and it contradicts the ratified posture:');
    console.log('    "keeps opacity and state and drops every spatial move". A control whose');
    console.log('    hover and focus colours snap has lost the feedback that says it responded.');
    failures += 1;
  } else {
    console.log(`  ✓ ${reduced.kept} elements keep a non-spatial transition — feedback survives`);
  }

  // ③ nothing is left cycling.
  if (reduced.running > 0) {
    console.log(`  ✗ ${reduced.running} keyframe animations still running under reduce`);
    failures += 1;
  } else {
    console.log('  ✓ no keyframe animation is left cycling');
  }

  // ② THE DURATION BUDGET. Listed, never failed on -- the ratified posture allows exactly two
  // authored exceptions (the 580ms card, the 1200ms theme pour) and this tool cannot tell them
  // from an accident. A gate that cannot distinguish the sanctioned case from the mistake is a
  // gate somebody switches off.
  if (normal.overBudget > 0) {
    console.log(`  ℹ ${normal.overBudget} elements transition for longer than 400ms — listed above.`);
    console.log('    Two authored exceptions are sanctioned; anything else is a finding.');
  } else {
    console.log('  ✓ every transition is inside the 400ms budget');
  }

  if (missed) {
    console.log(`  ⚠ ${missed} route loads never became ready and were NOT measured`);
    failures += 1;
  }

  // "Every route" is held against the router, not against this file's memory of it.
  for (const complaint of routeComplaints()) {
    console.log(`  ✗ ROUTES  ${complaint}`);
    failures += 1;
  }
} finally {
  await cdp?.close?.();
}

console.log(`\nSTATUS=${failures}`);
process.exit(failures ? 1 : 0);
