'use client';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

// Replaces the root layout, so it renders its own html/body and reaches
// neither globals.css nor the locale - both live in [locale]/layout.tsx, which
// is what has just failed. Hence English and its own styles: this is the last
// thing between a broken layout and a blank page. `metadata` is unavailable in
// a Client Component, so the title is React's own <title>, and the palette
// follows the OS rather than the app's theme class, which does not reach here.
export default function GlobalError({
  error,
  unstable_retry,
}: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong</title>
        <style>{`
          :root { color-scheme: light dark; --fg: #111; --bg: #fff; --muted: #555; }
          @media (prefers-color-scheme: dark) {
            :root { --fg: #f5f5f5; --bg: #111; --muted: #a1a1a1; }
          }
          body {
            margin: 0; min-height: 100vh; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 1rem; padding: 2rem;
            text-align: center; font-family: system-ui, sans-serif;
            background: var(--bg); color: var(--fg);
          }
          h1 { font-size: 1.5rem; font-weight: 600; margin: 0; }
          p { margin: 0; color: var(--muted); }
          button {
            padding: 0.5rem 1rem; border-radius: 0.375rem; border: 1px solid var(--fg);
            background: var(--fg); color: var(--bg); cursor: pointer; font: inherit;
          }
          .ref { font-size: 0.75rem; }
        `}</style>
        <h1>Something went wrong</h1>
        <p>The page could not be loaded. Try again in a moment.</p>
        <button onClick={() => unstable_retry()}>Try again</button>
        {error.digest ? <p className="ref">Reference: {error.digest}</p> : null}
      </body>
    </html>
  );
}
