// Only `[locale]/layout.tsx` renders <html>/<body> - this root layout exists
// solely because `app/page.tsx` (the unprefixed `/` fallback) needs some
// layout above it. Rendering html/body here too would nest <html> inside
// <body> (same fix as the hub's own ADR-020).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
