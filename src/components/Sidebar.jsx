import { X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import Logo from "./common/Logo";
import SidebarItem from "./common/SidebarItem";
import Button from "./form/Button";
import { navItems, authItems } from "../config/navigation";

/**
 * The drawer's id, so the header's hamburger can point `aria-controls` at it.
 *
 * Exported rather than written twice: two hand-typed copies of an id is how
 * `aria-controls` ends up naming an element that is not in the document, which fails
 * silently -- the attribute is simply ignored and the relationship is gone.
 */
export const SIDEBAR_ID = "app-navigation";

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

  return (
    <>
      {/* Overlay for mobile */}
      {sideBarOpen && (
        <div
          className="fixed inset-0 bg-transparent z-10 lg:hidden"
          onClick={() => setSideBarOpen(false)}
        ></div>
      )}

      <div
        id={SIDEBAR_ID}
        className={`fixed bg-bg-raised z-20 w-64 h-screen shadow flex flex-col ${
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
                className="flex items-center p-4 hover:bg-surface-2 text-nav-ink cursor-pointer transition-colors rounded-lg"
                onClick={() => setSideBarOpen(false)}
              >
                <Icon size={24} strokeWidth={1} className="mr-6 text-brand" />
                <div className="font-medium">{item.title}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
