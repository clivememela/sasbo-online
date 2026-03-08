import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <nav className="flex items-center text-sm font-medium mt-4">
      <Link to="/" className="hover:underline">Home</Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        let displayName = name.charAt(0).toUpperCase() + name.slice(1);
        if (name.toLowerCase() === "banks") {
          displayName = "Search Banks";
        }
        if (name.toLowerCase() === "organizer-report") {
          displayName = "Organizer's Report";
        }
        return (
          <div key={name} className="flex items-center">
            <ChevronRight size={16} strokeWidth={1.5} className="mx-2" />
            {isLast ? (
              <span className="text-gray-500 dark:text-gray-400">{displayName}</span>
            ) : (
              <Link to={routeTo} className="hover:underline">
                {displayName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
