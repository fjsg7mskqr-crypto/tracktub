import { requireOperator } from "@/lib/auth";

// Operator-only segment — non-operators are redirected (don't rely on the
// hidden nav link). Issue #97.
export default async function AddPropertyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOperator();
  return <>{children}</>;
}
