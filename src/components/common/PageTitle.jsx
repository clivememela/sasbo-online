// 🔴 BR-18 LANDED HERE IN 04.1, AS ONE CHANGE IN TWO PLACES.
//
// P0's baseline measured the rendered DOM on all 27 routes: 23 already contained exactly
// one <h1>, the SHELL's — the same string on every page, the application's name. So the
// one landmark a screen-reader user navigates by said nothing about where they were, and
// promoting this component ALONE would have given those 23 routes TWO <h1>s, which is
// precisely the shape /reports/organizer-report had and which P0 filed as F-D03.
//
// The other half is in `Header.jsx`: the banner there is now a <p>, because it names the
// APPLICATION and an application name is not a page heading. `headingContract.test.jsx`
// holds both halves together — it mounts every route and asserts no route renders two,
// and that the routes rendering none are exactly P4's remaining schedule.
export default function PageTitle({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl text-center text-brand-ink">
        {title}
      </h1>
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
