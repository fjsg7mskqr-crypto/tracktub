import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AddTubForm } from "@/components/tub/AddTubForm";
import { BackLink } from "@/components/tub/BackLink";

// Add tub. Dynamic: getCurrentMembership() reads the session cookie.
export default async function AddTubPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("client")
    .select("id, name")
    .order("name");
  if (error) throw new Error(`Failed to load clients: ${error.message}`);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "16px 20px 24px",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <BackLink href="/tubs" label="Tubs" />
      <h1
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        Add tub
      </h1>
      <AddTubForm clients={clients ?? []} />
    </main>
  );
}
