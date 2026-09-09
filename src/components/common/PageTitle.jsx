// ⚠️ THE HEADING LEVEL IS DELIBERATELY STILL <h2>, and BR-18 says it should be <h1>.
//
// It is not changed here because changing it ALONE would create a defect. P0's baseline
// measured the rendered DOM on all 27 routes: 23 of them already contain exactly one <h1>,
// the SHELL's — and it is the same string on every page, the application's name. Promoting
// PageTitle in isolation gives those 23 routes TWO <h1>s, which is precisely the shape
// /reports/organizer-report already has today and which P0 filed as F-D03.
//
// So BR-18 is ONE change in two places — the shell's banner stops being a heading, and
// PageTitle becomes the page's only <h1> — and it belongs to 04.1, which owns the shell.
// P1 migrates colour to tokens and changes nothing structural. See findings.md F-D03.
export default function PageTitle({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h2 className="text-3xl text-center text-brand-ink">
        {title}
      </h2>
      {/* brand, not brand-ink -- the SUBTITLE is deliberately the quieter of the two.
          01.2 first migrated both onto brand-ink and flattened a step the shell had:
          the title was cyan-700 and the subtitle cyan-600 in light, cyan-400 and
          cyan-500 in dark, so the subtitle was the lower-contrast one in BOTH themes.
          --color-brand sits exactly there against --color-brand-ink (light 5.47 vs
          8.26 on surface; dark 7.98 vs 11.17), so the pair needs no new token -- and
          "the shell should look approximately the same" is the invariant this
          restores, not a preference. */}
      {subtitle && (
        <p className="text-xl text-center mt-2 text-brand">
          {subtitle}
        </p>
      )}
    </div>
  );
}
