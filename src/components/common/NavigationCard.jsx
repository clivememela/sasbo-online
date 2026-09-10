import { Link } from "react-router-dom";

/**
 * A card that is a link to somewhere. `Home` and `ReportOptions` are built of these.
 *
 * 🔴 IT LEARNED A HUE, AND ONE OF THE HUES DID NOTHING. `bg-white dark:bg-gray-800`,
 * `text-gray-900 dark:text-gray-100`, `text-cyan-800 dark:text-cyan-300` — eleven colour
 * decisions restated by hand beside a token layer that already owns them. `04.1` moved
 * every one onto a role, so the dark theme now follows without a single `dark:` prefix.
 *
 * ⚠️ `text-shadow-cyan-500 dark:text-shadow-white` is GONE rather than translated. It
 * set a text-shadow COLOUR with no text-shadow to colour, on an SVG that has no text —
 * so it rendered nothing at all, in either theme. The same inert pair was on the
 * header's avatar and was removed there in P1. Removing a utility that painted nothing
 * is not a design change, and `headingContract`/`paletteLiterals` both stay green
 * across it.
 *
 * 📱 A CARD IS A LINK, AND THE WHOLE CARD IS THE TARGET. That was already true and is
 * worth keeping true: a card whose only hit area is its title is the commonest way a
 * touch target ends up under 44px while looking enormous.
 *
 * ♻️ THE `color` PROP IS GONE, AND IT WAS DEAD IN A WAY A GREP COULD NOT SEE. Every one
 * of the 44 `color:` entries in `navigation.js` is inside a COMMENTED-OUT block -- the
 * refactor pass found it by blanking comments before searching, which is the same trick
 * `sourceScan.js` exists for. So the prop had no caller, and what it carried when it did
 * was `text-red-600 dark:text-red-400`: a palette literal, and therefore a route back
 * into the tree for exactly what `paletteLiterals.test.js` now forbids.
 */
export default function NavigationCard({ title, icon: Icon, href, desc, onSelect }) {
  return (
    <Link
      to={href}
      onClick={onSelect}
      className="block rounded-card border border-line bg-surface p-6 text-ink shadow-(--shadow-1) transition-shadow duration-(--duration-fast) ease-(--ease-out) hover-hover:hover:shadow-(--shadow-2) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
    >
      {Icon && <Icon size={48} strokeWidth={1} aria-hidden="true" className="mb-4 mx-auto text-brand" />}
      <h3 className="mb-2 text-xl text-brand-ink">{title}</h3>
      {desc && <p className="text-ink-muted">{desc}</p>}
    </Link>
  );
}
