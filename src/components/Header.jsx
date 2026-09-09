import { Menu } from "lucide-react";
import Logo from "./common/Logo";
import ThemeToggle from "./common/ThemeToggle";
import Breadcrumbs from "./common/Breadcrumbs";
import Button from "./form/Button";
import { SIDEBAR_ID } from "./Sidebar";

export default function Header({ setSideBarOpen, sideBarOpen }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-10 flex h-40 flex-col justify-between p-4 lg:pl-64 bg-surface text-ink"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          {/* 🔴 IT HAD NO ACCESSIBLE NAME. An icon-only <button> whose only child is an
              SVG announces as "button" and nothing else, so the one control that opens
              the navigation on a phone was unusable by anyone not looking at it. It is
              now the `Button` primitive at `size="icon"`, which also brings the 44px
              coarse-pointer hit area and the focus ring the raw tag never had.

              `aria-expanded` + `aria-controls` are the other half: the drawer it opens
              is a sibling in `AppLayout`, so without them nothing connects the two. */}
          <Button
            size="icon"
            variant="ghost"
            className="lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={Boolean(sideBarOpen)}
            aria-controls={SIDEBAR_ID}
            onClick={() => setSideBarOpen(true)}
          >
            <Menu size={24} strokeWidth={1.5} aria-hidden="true" />
          </Button>
          <div className="flex items-center gap-2">
            {/* 🔴 BR-18, AND THIS IS THE HALF THAT IS EASY TO MISS. This was the <h1> P0
                found on 23 of 27 routes — identical on every one of them, because it
                names the APPLICATION and not the page. A landmark that says the same
                thing everywhere is not a landmark. It is a banner label now, and
                `PageTitle` is the page's only <h1>. Both halves are held by
                `headingContract.test.jsx`, which mounts every route and counts. */}
            <p className="text-2xl hidden md:block text-brand-ink">Membership Administration System</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* ⚠️ A PLACEHOLDER, AND NOW AN HONEST ONE. This was a <button> with no
              handler, no accessible name and no menu behind it — a tab stop that did
              nothing, announcing as "button". Authentication is DEFERRED (R-SEC-C), so
              there is no account for it to open and no signed-in person for the initials
              to belong to. It stays as the shell's visual anchor, as a non-interactive
              chip that assistive technology is not told to believe in.

              When authentication lands this becomes a real account menu, and its label
              comes from the session rather than from two hard-coded letters. */}
          <p
            aria-hidden="true"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-2 text-ink select-none"
          >
            CM
          </p>
          <ThemeToggle />
        </div>
      </div>

      <Breadcrumbs />
    </header>
  );
}
