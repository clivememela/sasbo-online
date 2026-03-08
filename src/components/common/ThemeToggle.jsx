import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from '../../context/useTheme';

export default function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="flex items-center gap-2 cursor-pointer" onClick={toggleDarkMode}>
      <span className="text-sm font-medium">{darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
      {darkMode ? (
        <SunIcon size={36} strokeWidth={1.5} className="p-2 bg-yellow-300 text-black rounded-full" />
      ) : (
        <MoonIcon size={36} strokeWidth={1.5} className="p-2 bg-gray-700 text-yellow-300 rounded-full" />
      )}
    </div>
  );
}
