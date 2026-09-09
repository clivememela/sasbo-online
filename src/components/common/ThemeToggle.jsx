import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from '../../context/useTheme';

export default function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="flex items-center gap-2 cursor-pointer" onClick={toggleDarkMode}>
      <span className="text-sm font-medium">{darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
      {/* Each icon renders in exactly one theme, so a single token reads correctly in both:
          the sun only ever appears while `.dark` is set, the moon only while it is not. */}
      {darkMode ? (
        <SunIcon size={36} strokeWidth={1.5} className="p-2 bg-accent text-bg rounded-full" />
      ) : (
        <MoonIcon size={36} strokeWidth={1.5} className="p-2 bg-ink text-accent rounded-full" />
      )}
    </div>
  );
}
