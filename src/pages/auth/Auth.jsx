import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Info, LogIn, UserPlus } from 'lucide-react';

import Button from '../../components/form/Button';
import Logo from '../../components/common/Logo';
import TextInput from '../../components/form/TextInput';
import useFocusOn from '../../hooks/useFocusOn.js';

/**
 * The sign-in screen. `04.1`.
 *
 * 🔴 R-SEC-C — THE TWO LINES THIS WAVE EXISTS TO DELETE. This screen used to do
 * `console.log('Login attempt:', { email, password })` and the same again on sign-up, so
 * every credential anyone typed was written in plaintext to the browser console, where it
 * survives in a saved HAR, a screen share, or any extension that reads the console. They
 * are gone. Nothing here logs, stores or transmits what is typed.
 *
 * 🗣️ AUTHENTICATION ITSELF IS DEFERRED — the owner's decision, third dialog 2026-09-09.
 * There is no request, no session and no route guard, and the server's `/api/**` is
 * `permitAll`. So the honest thing is not to build a convincing login; it is to say so.
 * The notice below is on the screen, in both modes, and it is not dismissible.
 *
 * ⚠️ THE FORM STILL NAVIGATES, DELIBERATELY. `/` redirects here and this button is the
 * only door into the application; removing the navigation would lock everybody out of a
 * system that has no authentication to lock them out with. What changed is that the
 * screen no longer implies the door is locked.
 *
 * 🔑 `alert()` IS GONE, AND THAT IS A UX FIX, NOT A COSMETIC ONE. "Passwords don't
 * match" arrived as a native modal: it stole focus, it could not be styled, it said
 * nothing about WHICH field was wrong, and on dismissal it left the user staring at a
 * form with no indication of what to fix. It is now an error summary that names the
 * field, is focused on submit, and links to it — the pattern `conventions.md` requires of
 * every form and the shape `06.1` will generalise.
 */

/** Every reason a submission can be refused, checked in the order a reader meets them. */
const validate = ({ isLogin, name, email, password, confirmPassword }) => {
  const errors = {};

  if (!isLogin && !name.trim()) errors.name = 'Enter your full name.';
  if (!email.trim()) errors.email = 'Enter your email address.';
  if (!password) errors.password = 'Enter your password.';

  if (!isLogin) {
    if (!confirmPassword) {
      errors.confirmPassword = 'Re-enter your password to confirm it.';
    } else if (password && password !== confirmPassword) {
      // 🔴 THE ERROR GOES ON THE FIELD THAT CAN FIX IT. `alert()` blamed neither, so a
      // member with a typo in the first box retyped the second one and failed again.
      errors.confirmPassword = 'The two passwords do not match.';
    }
  }

  return errors;
};

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // ONE piece of state, not three. The refactor pass found `submitted` and a
  // `refusedAt` counter beside this, and neither carried information `errors` did not:
  // `errors` is non-empty exactly when a submission has been refused, because the only
  // writers are the submit handler and the mode switch (which clears it). Three sources
  // of truth for one fact is three chances for two of them to disagree.
  const [errors, setErrors] = useState({});
  const summaryId = useId();
  const navigate = useNavigate();

  const showErrors = Object.keys(errors).length > 0;

  // The summary takes focus once it EXISTS, and again on every submit: `validate()` returns a fresh `errors`
  // object each time, so the same mistakes twice still move focus. `useFocusOn` holds the reasons; `Auth.test.jsx`
  // caught the first draft, which focused from the submit handler and silently did nothing.
  const summaryRef = useFocusOn(errors, showErrors);

  const switchMode = (toLogin) => {
    setIsLogin(toLogin);
    // Errors from the other mode describe fields that are no longer on screen. Leaving
    // them would show a summary pointing at inputs that do not exist.
    setErrors({});
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const found = validate({ isLogin, name, email, password, confirmPassword });
    setErrors(found);

    // Focus goes to the summary rather than the first bad field -- it says how many
    // problems there are and lets the member choose where to start, which is what a
    // native `alert()` took away. The move itself happens in the effect above, once the
    // summary is actually in the document.
    if (Object.keys(found).length > 0) return;

    navigate(isLogin ? '/home' : '/');
  };

  return (
    // 🔴 `flex-1`, NOT `min-h-dvh`. This screen renders inside `AuthLayout`, whose column is
    // already a full viewport tall -- so a second `min-h-dvh` here made the page TWO
    // viewports of height stacked, centred the card in the upper one, and pushed the footer a
    // whole window further down. `flex-1` fills what the layout has left above its footer,
    // which is the one height this card should be centred in.
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-card bg-surface p-8 shadow-(--shadow-2)">
        {/* 🔑 THE RAIL'S OWN WORDMARK, because this is the first surface anybody sees and
            it should introduce the same product the shell does: the mark, SASBO Online, and
            the union's line in the brand's gold. The 96px logo floating over a centred
            heading was the old shell's idea of a login and belonged to no world. */}
        <div className="mb-7">
          <span className="flex items-center gap-3">
            <Logo className="size-11 shrink-0 object-contain" alt="" />
            <span className="grid min-w-0 leading-[1.15]">
              <span className="truncate text-md font-semibold tracking-[-0.01em] text-ink">SASBO Online</span>
              <small className="mt-[3px] truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-ink">
                The Finance Union
              </small>
            </span>
          </span>
          <h1 className="mt-6 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] text-ink">
            {isLogin ? 'Welcome back' : 'Join SASBO'}
          </h1>
          <p className="mt-1.5 text-base text-ink-muted">
            {isLogin ? 'Log in to the membership administration system.' : 'Create your account.'}
          </p>
        </div>

        {/* 🗣️ THE HONEST LABEL. Not a toast and not dismissible: a member who is about to
            type a password is entitled to know it is going nowhere. */}
        <p className="mb-6 flex gap-2 rounded-lg border border-line-strong bg-surface-2 p-3 text-sm text-ink-muted">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.5} />
          <span>
            Sign-in is not active yet. Nothing you enter here is sent, checked or stored —
            continuing simply opens the system.
          </span>
        </p>

        {/* ⚠️ NOT A `role="tablist"`, though it looks like one and the first draft said so.
            The ARIA tabs pattern is a contract — arrow keys move between tabs, the set
            takes ONE tab stop, each tab owns a `tabpanel` — and declaring the role without
            implementing it announces "tab 1 of 2" and then ignores the arrow key. Two
            plain buttons carrying `aria-current` promise nothing they do not do, and they
            already work from the keyboard. The full pattern needs the shared roving-focus
            hook that `05.3` owns. */}
        <div className="mb-6 flex rounded-lg bg-surface-2 p-1">
          {[
            { label: 'Login', active: isLogin, to: true },
            { label: 'Sign Up', active: !isLogin, to: false },
          ].map(({ label, active, to }) => (
            // The `Button` primitive rather than a raw tag, even wearing a segmented
            // control's skin: what it brings is the 44px coarse-pointer hit area and the
            // focus ring, neither of which the raw version had. `aria-current` passes
            // straight through, and `cn` is tailwind-merge so this skin's own border,
            // radius and fill win over the variant's.
            <Button
              key={label}
              aria-current={active ? 'true' : undefined}
              onClick={() => switchMode(to)}
              className={`flex-1 justify-center rounded-md border-transparent py-2 ${
                active
                  ? 'bg-surface text-brand-ink shadow-(--shadow-1)'
                  : 'bg-transparent text-ink-muted hover-hover:hover:text-ink'
              }`}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* THE ERROR SUMMARY, AND IT IS DELIBERATELY NOT A LIVE REGION.
            `role="alert"` here was the first draft and it was wrong twice over. `Field`
            already gives every error message `role="alert"`, so an empty submit inserted
            FIVE live regions in one tick — four fields and this — and a screen reader
            queues all five. And it is unnecessary: focus MOVES here on submit, and a
            focused element is announced without a live region. That is what the role is
            for — announcing something focus will not reach.

            `tabIndex={-1}` makes it focusable programmatically without adding a tab stop;
            `aria-labelledby` gives it the heading as its accessible name, so the
            announcement leads with what happened rather than with the first message. */}
        {showErrors && (
          <div
            ref={summaryRef}
            tabIndex={-1}
            aria-labelledby={summaryId}
            className="mb-4 rounded-lg border border-status-suspended-dot bg-status-suspended-bg p-3 text-sm text-status-suspended focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
          >
            <p id={summaryId} className="flex items-center gap-2 font-medium">
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              There is a problem with this form
            </p>
            <ul className="mt-1 list-disc pl-6">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {!isLogin && (
            <TextInput
              label="Full Name"
              kind="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="John Doe"
              error={errors.name}
              required
            />
          )}

          <TextInput
            label="Email Address"
            kind="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            error={errors.email}
            required
          />

          <TextInput
            label="Password"
            // `password` on login, `newPassword` on sign-up: the difference is what stops
            // a password manager autofilling the OLD credential into a new account.
            kind={isLogin ? 'password' : 'newPassword'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            required
          />

          {!isLogin && (
            <TextInput
              label="Confirm Password"
              kind="newPassword"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={errors.confirmPassword}
              required
            />
          )}

          {/* `noValidate` above turns the browser's own bubbles off, so this is the only
              validation the member meets — one behaviour rather than two that disagree. */}
          <Button type="submit" variant="primary" className="mt-4 w-full justify-center">
            {isLogin ? <LogIn size={20} aria-hidden="true" /> : <UserPlus size={20} aria-hidden="true" />}
            {/* ⚠️ "Create account", NOT "Sign up". The segmented control above already
                says "Sign Up", and so did the switch below -- THREE controls on one small
                card, two of them with the same accessible name. A screen-reader user
                tabbing through hears "Sign up, button" three times and cannot tell which
                one submits. Naming each for what it DOES fixes it for everybody. */}
            {isLogin ? 'Log In' : 'Create account'}
          </Button>
        </form>

        {/* The same action as the tabs above, offered where somebody looking for it
            would look. Kept as a control on its own line rather than a link inside the
            sentence: an inline button either loses its 44px hit area or wrecks the line
            height of the prose around it, and this screen is read on a phone. */}
        <div className="mt-6 flex flex-col items-center gap-1 text-sm text-ink-muted">
          <p>{isLogin ? "Don't have an account?" : 'Already have an account?'}</p>
          <Button variant="ghost" size="sm" onClick={() => switchMode(!isLogin)}>
            {isLogin ? 'Create one instead' : 'Log in instead'}
          </Button>
        </div>
      </div>
    </div>
  );
}
