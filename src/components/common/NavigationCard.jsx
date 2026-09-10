import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * A card that is a link to somewhere. `Home` and the menu pages are built of these.
 *
 * card.html has no menu page, so this inherits its world by rule: the register's
 * `card-surface` -- white, radius 14, the resting shadow, no border -- with the icon in
 * the brand's teal, the title in ink and the description in muted ink, left-aligned like
 * every other surface the mock draws. Hover lifts it to the popover depth.
 *
 * 📱 A CARD IS A LINK, AND THE WHOLE CARD IS THE TARGET. That was already true and is
 * worth keeping true: a card whose only hit area is its title is the commonest way a
 * touch target ends up under 44px while looking enormous.
 */
export default function NavigationCard({ title, icon: Icon, href, desc, onSelect }) {
  return (
    <Link
      to={href}
      onClick={onSelect}
      className="group flex min-h-36 flex-col rounded-lg bg-surface p-5 text-left text-ink shadow-(--shadow-1) transition-[box-shadow,transform] duration-(--duration-fast) ease-(--ease-out) hover-hover:hover:-translate-y-px hover-hover:hover:shadow-(--shadow-2) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
    >
      <span className="flex items-start justify-between gap-3">
        {Icon && (
          <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand-ink">
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
        )}
        <ArrowRight
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className="mt-3 text-ink-faint transition-transform duration-(--duration-fast) hover-hover:group-hover:translate-x-0.5"
        />
      </span>
      <span className="mt-auto block pt-5">
        <h3 className="text-md font-semibold text-ink">{title}</h3>
        {desc && <p className="mt-0.5 text-sm text-ink-muted">{desc}</p>}
      </span>
    </Link>
  );
}
