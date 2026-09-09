import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Footer from '../components/Footer';
import ErrorBoundary from '../components/common/ErrorBoundary';
import RoutePending from '../components/common/RoutePending';
import ThemeToggle from '../components/common/ThemeToggle';

export default function AuthLayout() {
  return (
    <div className="bg-bg min-h-screen transition-colors duration-300 flex flex-col">
      {/* 🔑 04.1 MERGED THE SECOND THEME BUTTON AWAY. This was a hand-rolled copy of
          `ThemeToggle` — the same job in different markup, and therefore a second place
          for every future accessibility fix to be applied to only one of. P1 left it
          deliberately, because consuming the shared control changes how the auth screens
          look and P1 was a like-for-like colour migration; lifting that constraint is
          this wave's job. What it buys: one accessible name, one `aria-pressed`, one
          focus ring, one hit area. The floating presentation survives as `compact`. */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle compact />
      </div>
      <div className="flex-1 flex flex-col">
        {/* The auth screens are lazy too, and they are the FIRST thing anyone loads --
            so this is the outlet most likely to meet a chunk that never arrives. */}
        <ErrorBoundary>
          <Suspense fallback={<RoutePending />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
      <Footer absolute />
    </div>
  );
}
