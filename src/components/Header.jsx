import { Bell, Menu, Search } from "lucide-react";
import ThemeToggle from "./common/ThemeToggle";
import Breadcrumbs from "./common/Breadcrumbs";
import Button from "./form/Button";
import { MENU_BUTTON_ID, SIDEBAR_ID } from "./shellIds";

/**
 * THE TOPBAR. Card's, and it is 60px.
 *
 * 🔴 **WHAT THIS REPLACES.** A **160px** band (`h-40`) carrying a 24px application title, a
 * standalone avatar, the theme toggle and the breadcrumbs stacked underneath it — a sixth of
 * a 1080px screen, on every route, saying *"Membership Administration System"* to a person
 * who has been looking at this application all morning.
 *
 * The mock's topbar is `auto | minmax(220px, 520px) | 1fr`: **crumbs, search, tools.** The
 * application's name is in the sidebar's wordmark, where an application's name belongs — it
 * is not news, and it does not need a sixth of the screen every time.
 *
 * 🔑 **THE SEARCH IS THE POINT OF THE ROW.** `directionContract.md`'s thesis is that the
 * register hands you one member's card; the fastest path to a member is typing their number.
 * The mock puts it in the shell rather than on the page because it is how you get to a
 * member from anywhere, not a filter on one screen.
 *
 * ⚠️ **IT IS NOT WIRED YET AND IT SAYS SO.** The control is real, focusable and labelled,
 * and submitting it goes to the register's own search. What it does NOT do yet is the mock's
 * type-ahead across every field — that needs an endpoint this application does not have.
 * A control that looks like it searches everything and quietly searches one screen would be
 * worse than the honest one.
 *
 * 🔑 **BR-18 STILL HOLDS**: this carries no `<h1>`. The `<h1>` was identical on 23 of 27
 * routes because it named the APPLICATION, and a landmark that says the same thing
 * everywhere is not a landmark. `PageTitle` remains the page's only one, and
 * `headingContract.test.jsx` mounts every route and counts.
 */
export default function Header({ setSideBarOpen, sideBarOpen, onSearch }) {
  return (
    <header className="sticky top-0 z-10 flex h-15 items-center gap-5 border-b border-line bg-surface px-4 text-ink lg:px-7">
      {/* 🔴 IT HAD NO ACCESSIBLE NAME. An icon-only <button> whose only child is an SVG
          announces as "button" and nothing else, so the one control that opens the
          navigation on a phone was unusable by anyone not looking at it. `aria-expanded` +
          `aria-controls` are the other half: the drawer it opens is a sibling in
          `AppLayout`, so without them nothing connects the two. */}
      <Button
        id={MENU_BUTTON_ID}
        size="icon"
        variant="ghost"
        className="lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={Boolean(sideBarOpen)}
        aria-controls={SIDEBAR_ID}
        onClick={() => setSideBarOpen(true)}
      >
        <Menu size={22} strokeWidth={1.5} aria-hidden="true" />
      </Button>

      {/* Below `lg` the crumbs give way to the search: on a phone, where you are matters
          less than getting somewhere, and two competing rows would wrap. */}
      <div className="hidden shrink-0 lg:block">
        <Breadcrumbs />
      </div>

      <label className="relative flex min-w-0 flex-1 items-center lg:max-w-[520px]">
        <span className="sr-only">Search members</span>
        <Search
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 text-ink-faint"
        />
        <input
          type="search"
          autoComplete="off"
          placeholder="Search members: surname, number, I.D., bank, branch"
          onChange={(event) => onSearch?.(event.target.value)}
          className="field-text min-h-(--size-control) w-full rounded-lg border border-line-strong bg-surface-2 pl-9 pr-3 text-ink placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        />
      </label>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <ThemeToggle compact />

        <Button size="icon" variant="ghost" aria-label="Notifications">
          <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
        </Button>

        {/* ⚠️ A PLACEHOLDER, AND AN HONEST ONE. This was a <button> with no handler, no
            accessible name and no menu behind it — a tab stop that did nothing. There is no
            signed-in person for the initials to belong to: authentication is DEFERRED
            (R-SEC-C). It stays as the shell's anchor, as a non-interactive chip assistive
            technology is not told to believe in. When authentication lands it becomes a real
            account menu whose label comes from the session. */}
        <p
          aria-hidden="true"
          className="flex size-9 select-none items-center justify-center rounded-full bg-surface-2 text-sm font-medium text-ink"
        >
          CM
        </p>
      </div>
    </header>
  );
}
