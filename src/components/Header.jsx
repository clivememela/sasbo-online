import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Menu, Search } from "lucide-react";
import Breadcrumbs from "./common/Breadcrumbs";
import Button from "./form/Button";
import { MENU_BUTTON_ID, SIDEBAR_ID } from "./shellIds";
import { cn } from "../lib/utils";

/**
 * THE TOPBAR. card.html's `.topbar`, and it is 60px.
 *
 * 🔴 **WHAT THIS REPLACES.** A **160px** band (`h-40`) carrying a 24px application title, a
 * standalone avatar, the theme toggle and the breadcrumbs stacked underneath it — a sixth of
 * a 1080px screen, on every route, saying *"Membership Administration System"* to a person
 * who has been looking at this application all morning.
 *
 * The mock's topbar is `auto | minmax(220px, 520px) | 1fr`: **crumbs, search, tools.** The
 * application's name is in the rail's wordmark, where an application's name belongs, and
 * the appearance switch is in the rail's foot, where the mock keeps it.
 *
 * 🔑 **THE SEARCH IS THE POINT OF THE ROW.** `directionContract.md`'s thesis is that the
 * register hands you one member's card; the fastest path to a member is typing their number.
 * It lives in the shell because it is how you get to a member from anywhere: typing here on
 * any other route takes you to the register with the query applied. The chip beside the
 * field names what the register recognised -- a membership number, an I.D. number, a name --
 * so the user knows the search understood them before the rows move.
 *
 * ⌘K, Ctrl+K and `/` focus it, as the mock's `kbd` promises.
 *
 * 🔑 **BR-18 STILL HOLDS**: this carries no `<h1>`. `PageTitle` remains the page's only one,
 * and `headingContract.test.jsx` mounts every route and counts.
 */

/** What the search recognised: the register's own identifiers, named as the user types them. */
export function searchKind(query) {
  const q = String(query ?? "").trim();
  if (!q) return "";
  if (/^m-?\d{3,}$/i.test(q)) return "Membership number";
  if (/^\d{13}$/.test(q)) return "I.D. number";
  if (/^(\+27|0)\s?\d{2}[\s-]?\d{3}[\s-]?\d{4}$/.test(q)) return "Cellphone number";
  if (/^\+27|^0\d{1,2}\s?\d{0,3}$/.test(q)) return "Phone number";
  if (/^[a-z]{2,4}-?\d{3,}$/i.test(q)) return "Employee number";
  if (/@/.test(q)) return "Email address";
  if (/^\d{6,12}$/.test(q)) return "I.D. or account number";
  if (/^[a-z][a-z' -]{1,}$/i.test(q)) return "Name or surname";
  return "";
}

const REGISTER_PATH = "/members";

export default function Header({ setSideBarOpen, sideBarOpen, search = "", setSearch }) {
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const kind = searchKind(search);

  useEffect(() => {
    const onKeyDown = (event) => {
      const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(event.target?.tagName || "") || event.target?.isContentEditable;
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const onChange = (event) => {
    const value = event.target.value;
    setSearch?.(value);
    // The search is the register's. Typing it anywhere else takes you there, once, and
    // keeps the focus in the field so the next keystroke lands where the last one did.
    if (value && location.pathname !== REGISTER_PATH) {
      navigate(REGISTER_PATH);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <header
      className={cn(
        // `shrink-0`: the topbar is a flex child of a column whose content overflows on
        // every long register, and a flex column squashes its children to their content
        // before it scrolls -- measured at 39px instead of 60 on Members, exactly the
        // rows of the search pill the reviewer found cut off. The height is the mock's
        // and it does not negotiate.
        "sticky top-0 z-10 grid h-15 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 text-ink",
        "grid-cols-[auto_minmax(0,1fr)_auto]",
        "lg:grid-cols-[auto_minmax(220px,520px)_1fr] lg:gap-5 lg:px-7",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* 🔴 IT HAD NO ACCESSIBLE NAME. An icon-only <button> whose only child is an SVG
            announces as "button" and nothing else, so the one control that opens the
            navigation on a phone was unusable by anyone not looking at it. `aria-expanded` +
            `aria-controls` are the other half: the drawer it opens is a sibling in
            `AppLayout`, so without them nothing connects the two. */}
        <Button
          id={MENU_BUTTON_ID}
          size="icon"
          variant="ghost"
          className="lg:hidden"
          aria-label="Open navigation menu"
          aria-expanded={Boolean(sideBarOpen)}
          aria-controls={SIDEBAR_ID}
          onClick={() => setSideBarOpen(true)}
        >
          <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
        </Button>

        {/* The mock drops the crumbs at 1100px: on a narrow window, where you are matters
            less than getting somewhere, and two competing rows would wrap. */}
        <div className="hidden min-[1101px]:block">
          <Breadcrumbs />
        </div>
      </div>

      <label
        className={cn(
          "flex h-[38px] min-w-0 items-center gap-2.5 rounded-[10px] border border-line-strong bg-surface-2 px-3",
          "transition-[border-color,box-shadow,background-color] duration-(--duration-instant)",
          "focus-within:border-brand focus-within:bg-surface focus-within:shadow-[0_0_0_3px_var(--color-brand-ring)]",
        )}
      >
        <span className="sr-only">Search members</span>
        <Search size={17} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-faint" />
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          value={search}
          onChange={onChange}
          placeholder="Search members: surname, number, I.D., bank, branch"
          className="search-text min-w-0 flex-1 border-0 bg-transparent text-ink placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        {kind && (
          <span
            aria-live="polite"
            className="kind-in inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full bg-brand-soft px-2 text-xs font-semibold tracking-[0.03em] text-brand-ink"
          >
            {kind}
          </span>
        )}
        <kbd
          title="Ctrl or ⌘ + K focuses search; / also works"
          className="hidden shrink-0 rounded-[5px] border border-line-strong border-b-2 bg-surface px-[5px] py-[3px] font-sans text-[11px] font-medium leading-none text-ink-muted sm:inline-block"
        >
          ⌘K
        </kbd>
      </label>

      <div className="flex items-center justify-end gap-1.5">
        <Button size="icon" variant="ghost" aria-label="Notifications">
          <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
        </Button>

        {/* ⚠️ A PLACEHOLDER, AND AN HONEST ONE. There is no signed-in person for the pill to
            belong to: authentication is DEFERRED (R-SEC-C). It stays as the shell's anchor,
            as a non-interactive chip assistive technology is not told to believe in. When
            authentication lands it becomes the mock's account menu, whose name comes from
            the session. */}
        <p
          aria-hidden="true"
          className="flex h-9 select-none items-center gap-2.5 rounded-full py-0 pl-1 pr-2.5"
        >
          <span className="grid size-7 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
            SA
          </span>
          <span className="hidden whitespace-nowrap text-[13.5px] font-medium text-ink md:inline">Administrator</span>
        </p>
      </div>
    </header>
  );
}
