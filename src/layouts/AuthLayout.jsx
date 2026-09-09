import { Outlet } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { MoonIcon, SunIcon } from 'lucide-react';
import Footer from '../components/Footer';

export default function AuthLayout() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="bg-bg min-h-screen transition-colors duration-300 flex flex-col">
      {/* ⚠️ A SECOND THEME CONTROL, and it stays a second one for now.
          `ThemeToggle` does the same job in the header, and consolidating is right --
          but it is not right HERE. That component puts its padding and an accent
          background on the ICON; this one puts padding and a surface background on the
          BUTTON. Consuming it would change how the auth screens look, and P1 is a
          like-for-like migration: "if it looks different, the tokens are wrong."
          The merge belongs to 04.1, which owns the shell and is allowed to change it.

          What IS fixed here is the token-layer hole: this was the only `dark:` colour
          variant left in the eight shell files. `bg-surface text-ink dark:text-accent`
          made the component learn a theme, which is the one thing the token layer
          exists to stop. Each icon renders in exactly one theme, so each takes one
          token -- the same reasoning ThemeToggle already records. */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleDarkMode}
          type="button"
          aria-pressed={darkMode}
          className="p-2 rounded-full bg-surface shadow-md cursor-pointer hover:bg-surface-2 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode
            ? <SunIcon size={24} strokeWidth={1.5} className="text-accent" />
            : <MoonIcon size={24} strokeWidth={1.5} className="text-ink" />}
        </button>
      </div>
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
      <Footer absolute />
    </div>
  );
}
