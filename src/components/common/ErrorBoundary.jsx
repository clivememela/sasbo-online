import { Component } from 'react';

/**
 * THE APPLICATION'S ONLY ERROR BOUNDARY. R-ROB-A, register row A11.
 *
 * 🔴 There was none. A throw during render in any component unmounted the ENTIRE
 * application and left a white page -- no message, no way back, nothing in the UI to
 * say anything had happened. `03.1` made that worse before it made it better: every
 * route is now `lazy()`, so a chunk that fails to load (a bad deploy, a network blip,
 * a stale index.html pointing at a hash that no longer exists) throws during render
 * on a completely healthy application.
 *
 * It ships HERE, in `03.1`, rather than in `06.1` where its fallback is designed,
 * because `03.1` is the unit that introduced the failure mode. The fallback below is
 * deliberately plain and says so: `06.1` owns what it looks like, this owns that it
 * exists. What it must already do is the part that is not cosmetic --
 *
 *   - say something happened, in words, rather than showing nothing
 *   - offer a way BACK, because a boundary with no exit is a white page with text
 *   - hand the error to `onError` so a TEST can attribute the failure to a route
 *
 * That last one is why the route smoke test can name the page that broke. Without a
 * boundary a failed import surfaces as an unattributed "1 unhandled error" after the
 * run, and the test for the broken route reports GREEN.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // No console.error here by default: `main.jsx` already listens, and a boundary
    // that logs unconditionally makes a handled error look unhandled in the console.
    this.props.onError?.(error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(this.state.error, () => this.setState({ error: null }));
    }

    return (
      <div
        data-testid="route-error"
        role="alert"
        className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <p className="text-lg font-medium text-ink">This page could not be displayed.</p>
        <p className="text-sm text-ink-muted max-w-prose">
          Something went wrong while loading it. Nothing you entered has been sent.
        </p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand hover-hover:hover:bg-brand-hover"
        >
          Try again
        </button>
      </div>
    );
  }
}
