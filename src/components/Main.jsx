import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ErrorBoundary from "./common/ErrorBoundary";
import RoutePending from "./common/RoutePending";

export default function Main({ setSideBarOpen, setSelectedCardHref }) {
  return (
    <main className="fixed top-40 bottom-0 left-0 right-0 flex-1 flex flex-col overflow-y-auto lg:left-64">
      <Header setSideBarOpen={setSideBarOpen} />
      <div className="flex-1 w-full flex flex-col pb-14">
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
      </div>
      <Footer />
    </main>
  );
}
