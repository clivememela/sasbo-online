import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from '../../context/useTheme';
import { cn } from '../../lib/utils';

/**
 * The theme control. N7.
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
 * 🔑 `04.1` MERGED THE SECOND ONE INTO THIS. `AuthLayout` carried its own theme button:
 * same job, different markup, and — because it was written separately — a different
 * accessible name and no `aria-pressed` at first. Two implementations of one control is
 * two places for the next accessibility fix to be applied to only one of. P1 deliberately
 * left them apart because merging changes how the auth screens LOOK, and P1 was a
 * like-for-like colour migration; `04.1` owns the shell and is allowed to.
 *
 * ⚠️ THE DIFFERENCE THAT MADE THEM LOOK LIKE TWO CONTROLS IS PRESENTATION, NOT
 * BEHAVIOUR — one showed its label, the other was a floating icon — so it is a `compact`
 * prop, not a fork. The label is still there when compact; it is the accessible name.
 */
export default function ThemeToggle({ compact = false, className }) {
  const { darkMode, toggleDarkMode } = useTheme();
  const label = darkMode ? "Switch to Light Mode" : "Switch to Dark Mode";

  // One element, not two near-identical branches. The refactor pass found the sun and
  // the moon written out separately with the same size, stroke, `aria-hidden` and
  // structure -- four things that have to be changed twice and, when they are not, quietly
  // differ between themes.
  //
  // Each icon renders in exactly one theme, so a single token reads correctly in both:
  // the sun only ever appears while `.dark` is set, the moon only while it is not.
  const { Icon, iconClass } = darkMode
    ? { Icon: SunIcon, iconClass: compact ? "text-accent" : "p-2 bg-accent text-bg rounded-full" }
    : { Icon: MoonIcon, iconClass: compact ? "text-ink" : "p-2 bg-ink text-accent rounded-full" };

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      aria-pressed={darkMode}
      className={cn(
        "flex items-center gap-2 cursor-pointer rounded-full",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring",
        compact && "touch-target bg-surface p-2 shadow-md transition-colors hover:bg-surface-2",
        className,
      )}
    >
      {/* Hidden visually when compact, never removed, and NO `aria-label` beside it.
          The label a screen reader announces and the label a sighted user reads are the
          same string from the same place — an `aria-label` here would be a second
          source, which is exactly how the two implementations came to disagree about
          what this control is called. */}
      <span className={cn("text-sm font-medium", compact && "sr-only")}>{label}</span>
      <Icon size={compact ? 24 : 36} strokeWidth={1.5} aria-hidden="true" className={iconClass} />
    </button>
  );
}
