import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from '../../context/useTheme';

/**
 * The header's theme control. N7.
 *
 * 🔴 IT WAS A `<div onClick>`, so the only way to change theme was a mouse: no tab
 * stop, no Enter, no Space, nothing announced. `01.2` had N7 on its list and shipped
 * without it, and nothing noticed until the contrast phase's theme check looked for a
 * BUTTON and found none.
 *
 * `aria-pressed` rather than `role="switch"`: this toggles a property of the page the
 * user is already on, which is what a toggle button is for. The visible label says what
 * pressing it will DO ("Switch to Dark Mode"), so the accessible name changes with the
 * state and `aria-pressed` carries the rest.
 *
 * ⚠️ `AuthLayout` has a SECOND theme button, deliberately not merged here in P1 -- the
 * two are styled differently (padding and background on the icon here, on the button
 * there) and unifying them changes how the auth screens look. That is 04.1's, which
 * owns the shell and is allowed to change it.
 */
export default function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      aria-pressed={darkMode}
      className="flex items-center gap-2 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
    >
      <span className="text-sm font-medium">{darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
      {/* Each icon renders in exactly one theme, so a single token reads correctly in both:
          the sun only ever appears while `.dark` is set, the moon only while it is not. */}
      {darkMode ? (
        <SunIcon size={36} strokeWidth={1.5} className="p-2 bg-accent text-bg rounded-full" />
      ) : (
        <MoonIcon size={36} strokeWidth={1.5} className="p-2 bg-ink text-accent rounded-full" />
      )}
    </button>
  );
}
