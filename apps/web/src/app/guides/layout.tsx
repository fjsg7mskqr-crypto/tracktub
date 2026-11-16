// MUST stay dynamic — see the note in src/app/login/layout.tsx (#41, #271, #281).
// Applies to /guides and every /guides/[slug]: the enforcing CSP is nonce-based
// with 'strict-dynamic', so prerendered HTML is served nonce-less and all of its
// scripts are blocked. tests/csp-nonce-coverage.test.ts guards it.
export const dynamic = "force-dynamic";

export default function GuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
