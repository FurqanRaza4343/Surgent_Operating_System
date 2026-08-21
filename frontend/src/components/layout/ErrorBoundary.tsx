import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// A render error anywhere in the tree currently shows a blank white page in
// production, with no way for a visitor to recover. This catches it and shows
// a minimal, on-brand fallback with a reload action instead.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled render error:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-canvas px-6 text-center font-sans">
        <p className="font-display text-2xl font-500 text-ink">Something went wrong.</p>
        <p className="max-w-sm text-ink-soft">
          Please reload the page. If this keeps happening, let us know.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">

          Reload
        </button>
      </div>);

  }
}
