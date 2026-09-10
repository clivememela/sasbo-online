import '../assets/styles/App.css'
import { useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Main, { MAIN_CONTENT_ID } from "../components/Main";

export default function AppLayout() {
  const [sideBarOpen, setSideBarOpen] = useState(false);
  const [selectedCardHref, setSelectedCardHref] = useState(null);

  // ✅ R-RESP-F, done in P5 as P1 said it would be. `h-screen` is `100vh`, which on a phone
  // is the viewport WITHOUT the browser chrome that is actually on screen -- so the shell was
  // taller than the window and the bottom of every page sat under the address bar. `h-dvh`
  // is the same measurement against the viewport that is really there.
  return (
    <div className="bg-bg h-dvh">
      {/* 🔑 THE SKIP LINK, AND IT IS THE FIRST FOCUSABLE THING IN THE DOCUMENT — which is
          the entire requirement. This application puts a full navigation tree ahead of the
          content, so without it a keyboard user tabs through every menu item on every
          route before reaching the page. Visible only while focused: `sr-only` until
          `focus-visible`, then a real, positioned control. */}
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-brand focus-visible:px-4 focus-visible:py-2 focus-visible:text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
      >
        Skip to main content
      </a>
      <Sidebar
        sideBarOpen={sideBarOpen}
        setSideBarOpen={setSideBarOpen}
        selectedCardHref={selectedCardHref}
      />
      <Main
        sideBarOpen={sideBarOpen}
        setSideBarOpen={setSideBarOpen}
        setSelectedCardHref={setSelectedCardHref}
      />
    </div>
  );
}
