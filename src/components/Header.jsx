import logo from "../assets/images/logo.png";
import { Menu, ChevronRight, MoonIcon, SunIcon } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useTheme } from '../context/useTheme';

export default function Header({ setSideBarOpen }) {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-10 flex h-40 flex-col justify-between p-4 lg:pl-64 bg-white dark:bg-gray-800 dark:text-white"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <button className="p-2 lg:hidden" onClick={() => setSideBarOpen(true)}>
            <Menu size={24} strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="SASBO Logo" className="h-20 w-auto" />
            <h1 className="text-2xl hidden md:block text-cyan-700 dark:text-cyan-400">Membership Enquiry System</h1>
            {/*<h1 className="text-xl md:hidden text-cyan-700 dark:text-cyan-400">SASBO</h1>*/}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-300 dark:bg-gray-700 text-shadow-cyan-500"
          >
            CM
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={toggleDarkMode}>
            <span className="text-sm font-medium">{darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
            {darkMode ? (
              <SunIcon size={36} strokeWidth={1.5} className="p-2 bg-yellow-300 text-black rounded-full" />
            ) : (
              <MoonIcon size={36} strokeWidth={1.5} className="p-2 bg-gray-700 text-yellow-300 rounded-full" />
            )}
          </div>
        </div>
      </div>

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
    </header>
  );
}
