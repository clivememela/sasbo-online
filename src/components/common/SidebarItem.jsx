import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

/**
 * ♻️ `item.color` IS GONE -- the twin of the dead prop `NavigationCard` carried, found
 * in the same pass and for the same reason: every `color:` in `navigation.js` sits in a
 * commented-out block, so both branches were unreachable and both would have re-admitted
 * a palette literal the day somebody uncommented one.
 */
export default function SidebarItem({ item, isActive, hasActiveSubItem, expandedItems, onToggle, onClick, selectedCardHref }) {
  const location = useLocation();
  const Icon = item.icon;
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isExpanded = expandedItems?.[item.href];
  const isCardSelected = selectedCardHref === item.href;
  const isSubItemActive = (subItem) => {
    if (location.pathname === subItem.href) return true;
    return (subItem.subItems || []).some(isSubItemActive);
  };

  const subListId = `sidebar-sub-${item.href.replace(/\W+/g, '-')}`;

  return (
    <div>
      {/* 🔴 THIS ROW WAS A `<div onClick>` WRAPPING A `<Link>`, AND BOTH HALVES WERE WRONG.

          For a parent item the div's handler called `onToggle`, so the ONLY way to expand a
          section was a mouse: no tab stop, no role, no key handler, and no `aria-expanded`
          to announce that a section existed at all. A keyboard user reached the `<Link>`,
          pressed Enter, and navigated — the sub-items were unreachable unless the route they
          landed on happened to expand them.

          And a click on the link fired BOTH handlers, because the link was inside the
          clickable div: it navigated and toggled at once. Two controls in one box, one of
          which nobody could see.

          The disclosure is now its own `<button>` beside the link, which is the standard
          shape: the link navigates, the button expands, and each says what it is. */}
      <div
        className={`flex items-center p-4 hover-hover:hover:bg-surface-2 text-nav-ink transition-colors rounded-lg ${
          isActive || hasActiveSubItem || isCardSelected
            ? 'bg-brand-soft ring-1 ring-brand-ring'
            : ''
        }`}
      >
        <Link
          to={item.href}
          className="flex items-center flex-1"
          onClick={onClick}
        >
          <Icon size={24} strokeWidth={1} className="mr-6" />
          <div className="font-medium">{item.title}</div>
        </Link>
        {hasSubItems && (
          <button
            type="button"
            aria-expanded={Boolean(isExpanded)}
            aria-controls={isExpanded ? subListId : undefined}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.title}`}
            onClick={() => onToggle(item.href)}
            className="touch-target -mr-1 shrink-0 rounded-md p-1 hover-hover:hover:bg-surface-2"
          >
            <ChevronDown
              size={20}
              strokeWidth={1}
              aria-hidden="true"
              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {hasSubItems && isExpanded && (
        <div id={subListId} className="ml-4 space-y-1">
          {item.subItems.map((subItem, index) => {
            const subItemHasChildren = subItem.subItems && subItem.subItems.length > 0;

            if (subItemHasChildren) {
              return (
                <SidebarItem
                  key={`${subItem.href}-${subItem.title}-${index}`}
                  item={subItem}
                  isActive={location.pathname === subItem.href}
                  hasActiveSubItem={isSubItemActive(subItem)}
                  expandedItems={expandedItems}
                  onToggle={onToggle}
                  onClick={onClick}
                  selectedCardHref={selectedCardHref}
                />
              );
            }

            const SubIcon = subItem.icon;
            const isSubActive = location.pathname === subItem.href;
            return (
              <Link
                key={`${subItem.href}-${subItem.title}-${index}`}
                to={subItem.href}
                className={`flex items-center p-3 hover-hover:hover:bg-surface-2 text-nav-ink cursor-pointer transition-colors rounded-lg text-sm ${
                  isSubActive ? 'bg-surface-2' : ''
                }`}
                onClick={onClick}
              >
                <SubIcon size={20} strokeWidth={1} className="mr-4" />
                <div className="font-medium">{subItem.title}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
