import Button from '../form/Button.jsx';
import { cn } from '../../lib/utils';

/**
 * A CHOICE OF HOW A PAGE LAYS OUT THE SAME THINGS -- Home's modules as cards, a list or a table (the 5 Oct Show & Tell).
 *
 * Toggle buttons in a named group, each carrying `aria-pressed`: Tab reaches every one, Enter or Space chooses it, and
 * the one chosen says so to a screen reader as well as by its fill. 🔑 NOT A RADIOGROUP, for the reason `Auth.jsx` gives
 * for the tablist it refused: that pattern promises arrow keys and a single tab stop, and three plain buttons promise
 * only what they do. The `Button` primitive brings the focus ring and the 44px coarse-pointer target; the skin is the
 * segmented control `Auth.jsx` wears, each choice named in words beside its icon.
 *
 * @param {{ label: string, value: string, onChange: (value: string) => void, className?: string,
 *   options: Array<{ value: string, label: string, icon?: import('react').ComponentType }> }} props
 */
export default function ViewSwitch({ label, options, value, onChange, className }) {
  return (
    <div role="group" aria-label={label} className={cn('flex rounded-lg bg-surface-2 p-1', className)}>
      {options.map(({ value: option, label: name, icon: Icon }) => {
        const chosen = option === value;
        return (
          <Button
            key={option}
            size="sm"
            aria-pressed={chosen}
            onClick={() => onChange(option)}
            className={cn(
              'rounded-md border-transparent',
              chosen
                ? 'bg-surface text-brand-ink shadow-(--shadow-1) hover-hover:hover:bg-surface'
                : 'bg-transparent text-ink-muted shadow-none hover-hover:hover:bg-transparent hover-hover:hover:text-ink',
            )}
          >
            {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />}
            {name}
          </Button>
        );
      })}
    </div>
  );
}
