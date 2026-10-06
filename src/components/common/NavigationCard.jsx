import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { cn } from "../../lib/utils";
import Sheet from "./Sheet.jsx";

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
 *
 * `note` is that caption, where "not yet available" is not the truth: month end's listings (`04.1`) ARE built, and
 * refuse until sign-in -- so their rows say *Waits for sign-in*. Keep it short: it never wraps, and sits beside the
 * title on a phone.
 *
 * 🗣️ `tile` IS HOME'S CARD VIEW, AND IT IS SASBO'S ASK OVER THE DIRECTION CONTRACT'S REFUSAL ABOVE. At the 5 Oct Show &
 * Tell Natalie said she liked the cards Home had before the rows, so Home offers both (handover §A) and opens on the
 * cards. It is the same destination drawn as a card -- the same icon in the brand's ink, name, line and chevron, the
 * sheet's surface and resting shadow, the whole card the target, and the same honest dead state -- so the two views
 * cannot drift apart. Every other menu page keeps the rows.
 */
const TILE = "flex h-full flex-col gap-3 rounded-lg bg-surface p-5 shadow-(--shadow-1)";

export default function NavigationCard({ title, icon: Icon, href, desc, onSelect, note = 'Not yet available', layout = 'row' }) {
  const tile = layout === 'tile';
  const body = (
    <span className="min-w-0 flex-1">
      <span className={cn("block font-semibold leading-tight", tile ? "text-lg" : "text-base")}>{title}</span>
      {desc && <span className={cn("block text-sm text-ink-muted", tile ? "mt-1" : "mt-0.5")}>{desc}</span>}
    </span>
  );

  if (tile) {
    if (!href) {
      return (
        <div className={cn(TILE, "text-ink-muted")}>
          {Icon && <Icon size={24} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-faint" />}
          {body}
          <span className="text-sm text-ink-muted">{note}</span>
        </div>
      );
    }
    return (
      <Link
        to={href}
        onClick={onSelect}
        className={cn(
          TILE,
          "group text-ink transition-shadow duration-(--duration-fast) ease-(--ease-out)",
          "hover-hover:hover:shadow-(--shadow-2) focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring",
        )}
      >
        <span className="flex items-start justify-between gap-3">
          {Icon && <Icon size={24} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-brand" />}
          <ChevronRight
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="ml-auto shrink-0 text-ink-faint transition-transform duration-(--duration-fast) hover-hover:group-hover:translate-x-0.5"
          />
        </span>
        {body}
      </Link>
    );
  }

  if (!href) {
    return (
      <div className={cn(ROW, "text-ink-muted")}>
        {Icon && <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-faint" />}
        {body}
        {/* A NOTE, NOT A STATUS CHIP. Set as small capitals it read as a label of the same
            weight as a table head, and nine of them down the Monthly Menu formed a second
            column that competed with the nine titles it was annotating. Sentence case in the
            quiet ink says the same thing and lets the names be read first. */}
        <span className="shrink-0 whitespace-nowrap text-sm text-ink-muted">{note}</span>
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

/**
 * A menu page's body: its cards as one ruled sheet (RF). Eight pages -- Home, the four admin menus, ACB, Archives and
 * Reports -- each wrote this sheet and this map, differing only in the React key they chose and in what a press
 * tells the shell. The key is `href` and title together, because two menus hold entries with no route yet.
 *
 * `onSelect(card)` is the page's word to the shell; `wide` is Home's, the one menu that spans the page. `className`
 * places the sheet -- month end's page (`04.1`) sets its lists under section headings, a step closer than a page head.
 * `tiles` lays the same cards out as cards (Home's card view), as many to a row as the page's width holds.
 */
export function NavigationList({ cards, onSelect, wide = false, tiles = false, className }) {
  if (tiles) {
    return (
      <div className={cn("mt-6 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4", className)}>
        {cards.map((card) => (
          <NavigationCard
            key={`${card.href}-${card.title}`}
            {...card}
            layout="tile"
            onSelect={onSelect && (() => onSelect(card))}
          />
        ))}
      </div>
    );
  }
  return (
    <Sheet className={cn("mt-6 divide-y divide-line", !wide && "max-w-4xl", className)}>
      {cards.map((card) => (
        <NavigationCard key={`${card.href}-${card.title}`} {...card} onSelect={onSelect && (() => onSelect(card))} />
      ))}
    </Sheet>
  );
}
