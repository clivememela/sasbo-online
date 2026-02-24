import { Outlet } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { MoonIcon, SunIcon } from 'lucide-react';
import Footer from '../components/Footer';

export default function AuthLayout() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen transition-colors duration-300 flex flex-col">
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleDarkMode}
          type="button"
          className="p-2 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-yellow-400 shadow-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <SunIcon size={24} strokeWidth={1.5} /> : <MoonIcon size={24} strokeWidth={1.5} />}
        </button>
      </div>
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
      <Footer absolute />
    </div>
  );
}
