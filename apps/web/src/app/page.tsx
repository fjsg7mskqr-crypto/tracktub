import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { StubPage } from "@/components/app/StubPage";

// Home stub until Lane 5 builds it. Stays dynamic: getCurrentMembership()
// reads the session cookie, so the page renders per request with the CSP nonce.
export default async function Home() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  return <StubPage title="Home" />;
}
