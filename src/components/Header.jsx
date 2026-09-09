import { Menu } from "lucide-react";
import Logo from "./common/Logo";
import ThemeToggle from "./common/ThemeToggle";
import Breadcrumbs from "./common/Breadcrumbs";

export default function Header({ setSideBarOpen }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-10 flex h-40 flex-col justify-between p-4 lg:pl-64 bg-surface text-ink"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <button className="p-2 lg:hidden" onClick={() => setSideBarOpen(true)}>
            <Menu size={24} strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2">
            <Logo className="h-20 w-auto" />
            {/* 🔴 THIS is the shell <h1> that P0 measured on 23 of 27 routes, identical on every
                one of them (findings.md F-D03). BR-18 turns it into a non-heading and promotes
                PageTitle to <h1> — as ONE change, in 04.1. Left alone here on purpose: P1 is
                colour only, and doing half of BR-18 gives 23 routes two <h1>s. */}
            <h1 className="text-2xl hidden md:block text-brand-ink">Membership Administration System</h1>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* `text-shadow-cyan-500` was on this button and is dropped: it sets a text-shadow
              COLOUR with no text-shadow to colour, so it rendered nothing. Not a redesign —
              the removal of a utility that was already inert. */}
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-2 text-ink"
          >
            CM
          </button>
          <ThemeToggle />
        </div>
      </div>

      <Breadcrumbs />
    </header>
  );
}
