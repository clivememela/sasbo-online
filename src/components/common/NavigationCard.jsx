import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { cn } from "../../lib/utils";

/**
 * One destination on a menu page -- a ROW of the wallet, not a card.
 *
 * 🔴 It was a grid of same-size icon-disc + heading + text cards, which is the scaffold the
 * direction contract refuses by name ("dashboards of same-size cards") and the first thing
 * the craft floor lists under page scaffolds; the finish review of 2026-09-10 named it as
 * the one material contradiction on Home. card.html has no menu page, so the menu takes the
 * register's own grammar: a sheet of rows, each with its icon in the brand's ink, its name,
 * what it holds, and a chevron -- read down the page the way the register is.
 *
 * 📱 THE WHOLE ROW IS THE TARGET. A row whose only hit area is its title is the commonest
 * way a touch target ends up under 44px while looking enormous.
 */

const ROW = "flex items-center gap-4 px-5 py-3.5";

/**
 * 🔴 A ROW WITH NO `href` IS NOT A LINK, AND UNTIL NOW IT PRETENDED TO BE ONE.
 *
 * `<Link to={undefined}>` renders an `<a href>` pointing at the CURRENT url. React-router
 * gives it no error and no warning, so the row arrived with a pointer cursor, a hover wash,
 * a chevron promising somewhere to go, and a click that did nothing whatever. Measured on
 * the running app, 2026-09-10: **ten such rows** -- all nine of Monthly Menu, and Bank/Branch
 * on Maintenance. A menu of nine identical dead ends is the worst thing a landing surface
 * can be, because the visitor blames themselves for it.
 *
 * These are not broken links; they are OPERATIONS THAT ARE NOT BUILT YET. So the row says
 * that, in the quietest way the world has: muted ink, no chevron, no hover, no cursor, out
 * of the tab order -- and a small caption on the right instead of the arrow. The decision
 * lives HERE rather than on each menu page, so the next entry someone adds without a route
 * cannot ship as a lie.
 *
 * 🗣️ It matches what the rail already does: `SidebarItem` renders a `<span>`, not a
 * `<Link>`, for a menu entry with no route.
 */
export default function NavigationCard({ title, icon: Icon, href, desc, onSelect }) {
  const body = (
    <span className="min-w-0 flex-1">
      <span className="block text-base font-semibold leading-tight">{title}</span>
      {desc && <span className="mt-0.5 block text-sm text-ink-muted">{desc}</span>}
    </span>
  );

  if (!href) {
    return (
      <div className={cn(ROW, "text-ink-muted")}>
        {Icon && <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-faint" />}
        {body}
        {/* A NOTE, NOT A STATUS CHIP. Set as small capitals it read as a label of the same
            weight as a table head, and nine of them down the Monthly Menu formed a second
            column that competed with the nine titles it was annotating. Sentence case in the
            quiet ink says the same thing and lets the names be read first. */}
        <span className="shrink-0 whitespace-nowrap text-sm text-ink-muted">Not yet available</span>
      </div>
    );
  }

  return (
    <Link
      to={href}
      onClick={onSelect}
      className={cn(
        ROW,
        "group text-ink transition-colors duration-(--duration-instant)",
        "hover-hover:hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-ring",
      )}
    >
      {Icon && <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-brand" />}
      {body}
      <ChevronRight
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        className="shrink-0 text-ink-faint transition-transform duration-(--duration-fast) hover-hover:group-hover:translate-x-0.5"
      />
    </Link>
  );
}
