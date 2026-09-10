import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ErrorBoundary from "./common/ErrorBoundary";
import RoutePending from "./common/RoutePending";
import { MAIN_CONTENT_ID } from "./shellIds";

export default function Main({ sideBarOpen, setSideBarOpen, setSelectedCardHref }) {
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
    <div className="fixed top-40 bottom-0 left-0 right-0 flex-1 flex flex-col overflow-y-auto lg:left-64">
      <Header sideBarOpen={sideBarOpen} setSideBarOpen={setSideBarOpen} />
      {/* `tabIndex={-1}` so the skip link has something it can actually move focus TO —
          a fragment link only moves the caret unless the target is focusable. */}
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 w-full flex flex-col pb-14">
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
