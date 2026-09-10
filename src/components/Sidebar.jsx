import { X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Logo from "./common/Logo";
import SidebarItem from "./common/SidebarItem";
import ThemeToggle from "./common/ThemeToggle";
import Button from "./form/Button";
import { navItems, authItems } from "../config/navigation";
import { MENU_BUTTON_ID, SIDEBAR_ID } from "./shellIds";
import { cn } from "../lib/utils";

/*
 * The chain of hrefs from the rail's root to `target`, and the SHORTEST one when a route
 * appears more than once. The menu lists Members twice -- at the top level, and three deep
 * under Admin Menu > Daily Menu -- and the first match in reading order is the deep one,
 * which opened Admin Menu and Daily Menu on every visit to the register. The rail the mock
 * shows has Members open at the top and Admin Menu closed.
 */
const findAncestors = (items, target, path = []) => {
  let best = null;
  for (const item of items) {
    const current = [...path, item.href];
    if (item.href === target && (!best || current.length < best.length)) best = current;
    if (item.subItems) {
      const found = findAncestors(item.subItems, target, current);
      if (found && (!best || found.length < best.length)) best = found;
    }
  }
  return best;
};

/**
 * THE RAIL. card.html's `.side`: the quiet second layer -- a full step below the page
 * ground, 256px, the wordmark at the top, the navigation as 36px rows, and the foot
 * carrying Appearance and Log out.
 *
 * Below `lg` it is the same column as a drawer, which is this application's measured
 * phone treatment (R-RESP) rather than the mock's 68px icon rail; the mock only ever
 * specified a desk.
 */
export default function Sidebar({ sideBarOpen, setSideBarOpen, selectedCardHref }) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});
  const [prevSelectedCardHref, setPrevSelectedCardHref] = useState(null);

  if (selectedCardHref !== prevSelectedCardHref) {
    setPrevSelectedCardHref(selectedCardHref);
    if (selectedCardHref) {
      const ancestors = findAncestors(navItems, selectedCardHref) || [selectedCardHref];
      setExpandedItems(prev => {
        const next = { ...prev };
        ancestors.forEach(href => { next[href] = true; });
        return next;
      });
    }
  }

  /*
   * The section holding the current route is open when you arrive on it. card.html shows
   * Members expanded with Capture Member under it because Members is where you are; a rail
   * that only expands on a click leaves a deep link -- /members/capture from a bookmark --
   * with its own section collapsed above it.
   */
  useEffect(() => {
    const ancestors = findAncestors(navItems, location.pathname);
    if (!ancestors) return;
    setExpandedItems(prev => {
      const next = { ...prev };
      let changed = false;
      // The whole chain, the current section included: Members open shows Capture Member
      // and Labels under it, which is how the mock draws the rail on the register.
      ancestors.forEach(href => {
        if (!next[href]) { next[href] = true; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [location.pathname]);

  const toggleExpand = (href) => {
    setExpandedItems(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  };

  const isSubItemActive = (subItems = []) => {
    return subItems.some((item) => {
      if (location.pathname === item.href) return true;
      return isSubItemActive(item.subItems || []);
    });
  };

  /**
   * 🔴 ESCAPE CLOSES THE DRAWER, AND UNTIL `05.4` NOTHING DID.
   *
   * The drawer had exactly two ways out and both of them were a mouse: the scrim below, and
   * the X inside it. On a phone that is fine, because a phone has no Escape key -- but the
   * drawer is also what a keyboard user on a narrow window gets, and for them an opened
   * drawer was a one-way door. Escape is the convention every dismissible overlay obeys, and
   * it is what makes the scrim's `aria-hidden` honest rather than a way of quieting a linter:
   * the click target is a mouse convenience, and the keyboard has its own route out.
   *
   * Focus goes back to the control that opened it. Leaving it where it was drops it on a
   * `<nav>` that is now translated off-screen, so the next Tab resumes from a place the user
   * cannot see -- the same defect `05.3` found in every dialog in the application, which is
   * why the drawer is checked for it too rather than assumed different.
   */
  useEffect(() => {
    if (!sideBarOpen) return;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setSideBarOpen(false);
      // The trigger is in `Header`, a sibling two levels up, so it is reached by the id
      // `Header` exports rather than by a ref threaded through `Main`.
      document.getElementById(MENU_BUTTON_ID)?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sideBarOpen, setSideBarOpen]);

  return (
    <>
      {/* The scrim: a click anywhere outside the drawer closes it.

          🔑 `aria-hidden` BECAUSE IT IS TRULY DECORATIVE, not to satisfy a rule. It is a
          transparent full-screen `<div>` whose only job is to catch a click a mouse user
          aims at "not the menu". There is nothing here to announce, nothing to focus, and
          putting it in the accessibility tree as a giant unlabelled control would be worse
          than leaving it out. The keyboard equivalent is Escape, above -- and `jsx-a11y`'s
          `click-events-have-key-events` and `no-static-element-interactions` both stand down
          for exactly this reason, because the element is no longer *visible* to assistive
          technology. Measured, 2026-09-10: with `aria-hidden` both rules go quiet; with
          `role="none"` instead, `role-supports-aria-props` fires. */}
      {sideBarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-ink/25 z-10 lg:hidden"
          onClick={() => setSideBarOpen(false)}
        ></div>
      )}

      {/* 🔴 A `<div>` HELD THE ENTIRE NAVIGATION. The application's whole menu tree — the
          only way to reach 25 of its 27 routes — carried no landmark at all, so a screen
          reader had nothing to jump to and nothing to skip past. `<nav>` costs a tag.

          The label is explicit because `Breadcrumbs` is also a `<nav>`: two unlabelled
          navigation landmarks are announced identically, which is worse than one. */}
      <nav
        id={SIDEBAR_ID}
        aria-label="Main"
        className={cn(
          "fixed z-20 flex h-dvh w-64 flex-col border-r border-line bg-bg-raised px-3 pb-3 pt-3.5",
          "shadow-(--shadow-2) transition-transform duration-(--duration-base) ease-(--ease-out)",
          sideBarOpen ? "translate-x-0" : "-translate-x-64",
          "lg:static lg:shrink-0 lg:translate-x-0 lg:shadow-none",
        )}
      >
        {/* 🔴 THE WORDMARK, AND WHAT IT REPLACES: "Enquiry Navigation Menu" — a label
            describing the furniture rather than naming the product. card.html puts SASBO
            Online and the union's strapline here, in the brand's gold, which is also WHY
            the topbar carries no application title: an application's name belongs in one
            place, and the rail is the place that is on screen at every width. */}
        <div className="relative flex items-center gap-2 px-2 pb-4 pt-1.5">
          <a
            href="/home"
            aria-label="SASBO Online home"
            className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
          >
            <Logo className="size-10 shrink-0 object-contain" />
            <span className="grid min-w-0 leading-[1.15]">
              <span className="truncate text-md font-semibold tracking-[-0.01em] text-ink">SASBO Online</span>
              {/* The strapline keeps the mock's tracking on the desk; in the drawer, where the
                  close control shares the row, it tightens a step rather than truncating. */}
              <small className="mt-[3px] whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-ink max-lg:tracking-[0.1em]">
                The Finance Union
              </small>
            </span>
          </a>
          {/* Same defect as the hamburger it undoes: an icon-only raw <button> with no
              accessible name, announcing as "button". The primitive brings the name, the
              44px coarse-pointer hit area and the focus ring. Positioned over the row's
              corner so the wordmark keeps its full width beside it. */}
          <Button
            size="icon"
            variant="ghost"
            className="absolute -top-1 right-0 lg:hidden"
            aria-label="Close navigation menu"
            onClick={() => setSideBarOpen(false)}
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>

        {/* card.css `.nav { display: grid; gap: 2px; flex: 1 }`: the rows STRETCH to the rail's
            height, so the menu reads down the whole rail rather than stopping a third of the
            way with a hole under it. The 36px pill sits at the top of each stretched track. */}
        <div className="scroll-quiet grid flex-1 gap-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              isActive={location.pathname === item.href}
              hasActiveSubItem={isSubItemActive(item.subItems)}
              expandedItems={expandedItems}
              onToggle={toggleExpand}
              onClick={() => setSideBarOpen(false)}
              selectedCardHref={selectedCardHref}
            />
          ))}
        </div>

        {/* card.html's `.side__foot`: the appearance switch, then the way out. */}
        <div className="grid gap-0.5 border-t border-line pt-3">
          <ThemeToggle variant="nav" />
          {authItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-lg px-2.5 text-base font-medium text-nav-ink",
                  "transition-[background-color,color] duration-(--duration-instant)",
                  "hover-hover:hover:bg-nav-hover hover-hover:hover:text-ink",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                )}
                onClick={() => setSideBarOpen(false)}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-nav-icon" />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
