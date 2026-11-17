// MUST stay dynamic — see the note in src/app/login/layout.tsx (#41, #271, #281).
// The enforcing CSP is nonce-based with 'strict-dynamic', so a prerendered
// /privacy would ship nonce-less HTML and every script on it would be blocked.
// tests/csp-nonce-coverage.test.ts guards it.
export const dynamic = "force-dynamic";

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
