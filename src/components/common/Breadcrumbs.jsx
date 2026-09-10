import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { navItems } from "../../config/navigation";

/**
 * The trail in the topbar -- card.html's `.crumbs`: 13px, muted, the current page in ink.
 */
export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Helper function to find title from navItems or capitalize path segment
  const getTitle = (path) => {
    // Exact match for top-level or sub-items
    for (const item of navItems) {
      if (item.href === path) return item.title;
      if (item.subItems) {
        const subItem = item.subItems.find(si => si.href === path);
        if (subItem) return subItem.title;
      }
    }

    // Special cases or formatting for segments not explicitly in navItems
    const lastSegment = path.split('/').pop();
    if (!lastSegment) return "Home";

    if (lastSegment.toLowerCase() === "banks") return "Bank / Branch";
    if (lastSegment.toLowerCase() === "apply") return "Member Application";
    if (lastSegment.toLowerCase() === "organizer-report") return "Organizer's Report";
    if (lastSegment.toLowerCase() === "daily-menu") return "Daily Menu";
    if (lastSegment.toLowerCase() === "miscellaneous") return "Admin Menu";

    // Fallback: capitalize and replace hyphens
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
  };

  const link = "rounded-sm transition-colors duration-(--duration-instant) hover-hover:hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring";

  if (location.pathname === "/home") {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-ink-muted">
        <span aria-current="page" className="font-medium text-ink">Home</span>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink-muted">
      <Link to="/home" className={link}>Home</Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const displayName = getTitle(routeTo);

        return (
          <span key={routeTo} className="flex items-center gap-1.5">
            {/* ink-faint on the chevron only: card.css calls --ink-3 "icons, dividers;
                never body text", and the labels beside it are ink-muted for that reason. */}
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" className="text-ink-faint" />
            {isLast ? (
              <span aria-current="page" className="font-medium text-ink">{displayName}</span>
            ) : (
              <Link to={routeTo} className={link}>
                {displayName}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
