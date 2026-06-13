import { requireOperator } from "@/lib/auth";

// Operator-only segment — non-operators are redirected. Issue #97.
export default async function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOperator();
  return <>{children}</>;
}
