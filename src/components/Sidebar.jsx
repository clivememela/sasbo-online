import { X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Logo from "./common/Logo";
import SidebarItem from "./common/SidebarItem";
import Button from "./form/Button";
import { navItems, authItems } from "../config/navigation";
import { MENU_BUTTON_ID, SIDEBAR_ID } from "./shellIds";

const findAncestors = (items, target, path = []) => {
  for (const item of items) {
    const current = [...path, item.href];
    if (item.href === target) return current;
    if (item.subItems) {
      const found = findAncestors(item.subItems, target, current);
      if (found) return found;
    }
  }
  return null;
};

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
          className="fixed inset-0 bg-transparent z-10 lg:hidden"
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
        className={`fixed bg-bg-raised z-20 w-64 h-dvh shadow flex flex-col ${
          sideBarOpen ? "translate-x-0" : "-translate-x-64"
        } lg:translate-x-0 lg:static transition ease-in-out duration-300`}
      >
        <div className="p-4 flex justify-between items-center border-b border-line">
          <div className="flex items-center gap-2 text-xl text-brand-ink">
            <Logo className="h-12 w-auto" />
            <span>Enquiry Navigation Menu</span>
          </div>
          {/* Same defect as the hamburger it undoes: an icon-only raw <button> with no
              accessible name, announcing as "button". The primitive brings the name, the
              44px coarse-pointer hit area and the focus ring. */}
          <Button
            size="icon"
            variant="ghost"
            className="lg:hidden"
            aria-label="Close navigation menu"
            onClick={() => setSideBarOpen(false)}
          >
            <X size={24} strokeWidth={1} aria-hidden="true" />
          </Button>
        </div>
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
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
          
          <div className="my-4 border-t border-line"></div>
          
          {authItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center p-4 hover-hover:hover:bg-surface-2 text-nav-ink cursor-pointer transition-colors rounded-lg"
                onClick={() => setSideBarOpen(false)}
              >
                <Icon size={24} strokeWidth={1} className="mr-6 text-brand" />
                <div className="font-medium">{item.title}</div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
