import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ErrorBoundary from "./common/ErrorBoundary";
import RoutePending from "./common/RoutePending";
import { MAIN_CONTENT_ID } from "./shellIds";
import OfflineBanner from "./common/OfflineBanner";
import { getLastNetworkFailureAt, onNetworkFailure } from "../lib/reportError";

export default function Main({ sideBarOpen, setSideBarOpen, setSelectedCardHref }) {
  /*
   * 🔑 OFFLINE IS ANNOUNCED ONCE, IN THE SHELL, AND NOT ONCE PER PANEL (EH-D11).
   *
   * It belongs here for the same reason the ErrorBoundary does: it is a fact about the
   * APPLICATION, not about any one screen. A member in a lift whose every panel reports its
   * own honest failure gets three true sentences and not the one that explains them -- and
   * then retries each panel in turn, from a lift.
   *
   * ⚠️ IT DOES NOT SUPPRESS THE PANELS' OWN STATES. A panel that failed while online and a
   * panel that failed because the connection went look alike for a moment and are not the
   * same situation; hiding the first to tidy the second would lose a real failure.
   */
  const [lastNetworkFailureAt, setLastNetworkFailureAt] = useState(getLastNetworkFailureAt);

  useEffect(() => onNetworkFailure(setLastNetworkFailureAt), []);

  return (
    /* 🔴 THE LANDMARKS WERE NESTED WRONG, AND THE COST WAS THAT THERE WERE NONE.
       `<main>` used to be this outer element, with `<Header>` and `<Footer>` inside it —
       and HTML says a `<header>` maps to the `banner` role ONLY when it is not a descendant
       of `<main>`, `<article>`, `<aside>`, `<nav>` or `<section>`. The same rule strips
       `contentinfo` from `<footer>`. So the application rendered a header, a footer and a
       main region, and a screen reader was offered exactly ONE landmark: nothing to jump
       to, nothing to skip. The elements were right and the nesting silently voided two of
       them.

       Swapping which element carries the class moves nothing on screen: `<main>` is now the
       content wrapper it always visually was, and the header and footer are its siblings. */
    /* 📐 THE SHELL IS A COLUMN THAT SCROLLS, not a fixed box offset by a 160px header.
       The header is `sticky` now and 60px tall, so nothing has to know its height -- the old
       `top-40` was that number written down in a second place, and a header that changed
       height left a 100px gap nobody could see in a diff. */
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
      <Header sideBarOpen={sideBarOpen} setSideBarOpen={setSideBarOpen} />
      {/* `tabIndex={-1}` so the skip link has something it can actually move focus TO —
          a fragment link only moves the caret unless the target is focusable. */}
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 w-full flex flex-col pb-14">
        {/* Above the boundary, so it survives a screen that threw -- an offline banner that
            disappears with the screen it was explaining is the one moment it was for. */}
        <div className="px-6 pt-6 empty:hidden">
          <OfflineBanner
            lastNetworkFailureAt={lastNetworkFailureAt}
            // 🔴 A RELOAD, AND SAYING WHY IT IS NOT A CHEAT MATTERS. Every panel already
            // owns its own retry; this one control stands for "everything that failed while
            // I was offline", which no single panel can re-run. The shell has no handle on
            // the route's fetches -- reaching for one would mean a global request registry,
            // which is a large amount of machinery for a button pressed once a month.
            onRetry={() => window.location.reload()}
          />
        </div>
        {/* 🔴 THE BOUNDARY IS HERE, INSIDE THE SHELL, and the position is the whole point.
            A11's standard-facing test says it in one line: "the shell must survive, and
            offer a way to recover". A boundary wrapped around <Routes> would catch the
            same errors and still blank the header, the navigation and the footer, because
            the layout renders INSIDE the routes. One broken panel has to stay one broken
            panel.

            Suspense sits inside it for the same reason: `03.1` made every route lazy, so
            the outlet is where a chunk arrives -- and where a chunk that fails to arrive
            throws. A boundary above the Suspense would never see it. */}
        <ErrorBoundary>
          <Suspense fallback={<RoutePending />}>
            <Outlet context={{ setSelectedCardHref, setSideBarOpen }} />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
