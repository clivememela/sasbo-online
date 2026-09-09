import { useId } from 'react';

import { cn } from '../../lib/utils';
import { attributesForKind } from './fieldKinds';

/**
 * The text field. `03.2a`.
 *
 * 🔴 `field-text`, NOT `text-sm`. This control used to be `text-sm`, which was 14px
 * under Tailwind's scale and is **13px** under this design's -- and iOS Safari zooms
 * the page when a focused control is under 16px. `field-text` is 16px on a coarse
 * pointer or a viewport under 760px and the design's field size otherwise; the
 * threshold is in px because 16 is iOS's number, not this design's. See conventions §5,
 * and `mockups/design/tools/prove_field_text.mjs`, which measures it in a browser
 * because jsdom cannot see a font size.
 *
 * 🔑 THE LABEL IS A REAL `<label htmlFor>`, and the `aria-label` that used to be on the
 * input is GONE. It duplicated the visible label, and when the two disagree the
 * accessible name silently wins over the one the user can read -- which is how a field
 * ends up announced as something other than what it says. One name, from the label.
 *
 * The error is wired with `aria-describedby` and `aria-invalid`, so a screen reader
 * reaches it without the user having to go looking, and `role="alert"` announces it
 * when it appears rather than only when focus lands.
 */
export default function TextInput({
  label,
  value,
  onChange,
  placeholder,
  kind = 'text',
  name,
  error,
  required,
  disabled,
  className,
  hint,
  ...rest
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const kindAttributes = attributesForKind(kind);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
      >
        {label}
        {required && (
          <>
            {' '}
            <span aria-hidden="true" className="text-status-suspended">*</span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>

      <input
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error && errorId, hint && hintId) || undefined}
        {...kindAttributes}
        {...rest}
        className={cn(
          'field-text rounded-lg border px-3 py-2 font-normal normal-case tracking-normal',
          'bg-surface text-ink placeholder:text-ink-faint',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring',
          'disabled:cursor-not-allowed disabled:opacity-60',
          error ? 'border-status-suspended' : 'border-line',
        )}
      />

      {hint && !error && (
        <span id={hintId} className="text-xs font-normal normal-case tracking-normal text-ink-muted">
          {hint}
        </span>
      )}

      {error && (
        <span
          id={errorId}
          role="alert"
          className="text-xs font-normal normal-case tracking-normal text-status-suspended"
        >
          {error}
        </span>
      )}
    </div>
  );
}
