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
      {subtitle && (
        <p className="text-xl text-center mt-2 text-brand-ink">
          {subtitle}
        </p>
      )}
    </div>
  );
}
