import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { StubPage } from "@/components/app/StubPage";

// Stub until its lane builds the screen. Stays dynamic: getCurrentMembership()
// reads the session cookie, so the page renders per request with the CSP nonce.
export default async function ReportsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  return <StubPage title="Reports" />;
}
