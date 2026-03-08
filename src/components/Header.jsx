import { Menu } from "lucide-react";
import Logo from "./common/Logo";
import ThemeToggle from "./common/ThemeToggle";
import Breadcrumbs from "./common/Breadcrumbs";

export default function Header({ setSideBarOpen }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-10 flex h-40 flex-col justify-between p-4 lg:pl-64 bg-white dark:bg-gray-800 dark:text-white"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <button className="p-2 lg:hidden" onClick={() => setSideBarOpen(true)}>
            <Menu size={24} strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2">
            <Logo className="h-20 w-auto" />
            <h1 className="text-2xl hidden md:block text-cyan-700 dark:text-cyan-400">Membership Administration System</h1>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-300 dark:bg-gray-700 text-shadow-cyan-500"
          >
            CM
          </button>
          <ThemeToggle />
        </div>
      </div>

      <Breadcrumbs />
    </header>
  );
}
