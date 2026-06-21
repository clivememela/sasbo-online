import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { navItems } from "../../config/navigation";

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
    
    if (lastSegment.toLowerCase() === "banks") return "BankBranch";
    if (lastSegment.toLowerCase() === "apply") return "Member Application";
    if (lastSegment.toLowerCase() === "organizer-report") return "Organizer's Report";
    if (lastSegment.toLowerCase() === "daily-menu") return "Daily Menu";
    if (lastSegment.toLowerCase() === "miscellaneous") return "Admin Menu";
    
    // Fallback: capitalize and replace hyphens
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
  };

  if (location.pathname === "/home") {
    return (
      <nav className="flex items-center text-sm font-medium mt-4">
        <span className="text-gray-500 dark:text-gray-400">Home</span>
      </nav>
    );
  }

  return (
    <nav className="flex items-center text-sm font-medium mt-4">
      <Link to="/home" className="hover:underline text-cyan-700 dark:text-cyan-400">Home</Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const displayName = getTitle(routeTo);

        return (
          <div key={routeTo} className="flex items-center">
            <ChevronRight size={16} strokeWidth={1.5} className="mx-2 text-gray-400" />
            {isLast ? (
              <span className="text-gray-500 dark:text-gray-400">{displayName}</span>
            ) : (
              <Link to={routeTo} className="hover:underline text-cyan-700 dark:text-cyan-400">
                {displayName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
