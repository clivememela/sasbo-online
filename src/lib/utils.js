import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Join class names, and let the LAST conflicting utility win.
 *
 * `clsx` handles the conditionals; `tailwind-merge` handles the part that bites --
 * `cn('px-4', 'px-2')` is `px-2`, not both. Without it a primitive that accepts a
 * `className` prop can only be overridden by luck of source order, which is how
 * "why is my padding not applying" becomes a `!important`.
 *
 * Every shadcn component imports this by the `@/lib/utils` alias in components.json;
 * it is the one file the registry assumes exists.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
