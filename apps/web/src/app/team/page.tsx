import { requireOperator } from "@/lib/auth";
import { EmptyState } from "@/components/ui";

// Operator-only. Placeholder shell for the Team surface — issue #98 builds the
// coverage + activity + invite-modal page here. Issue #97 ships the role guard
// and the route so the nav link resolves.
export default async function TeamPage() {
  await requireOperator();
  return (
    <div className="stack">
      <div className="pagehead">
        <h1>Team</h1>
        <p className="muted small">
          Invite your cleaner or a co-host, and see who&apos;s keeping your tubs
          captured.
        </p>
      </div>
      <EmptyState>Team coverage &amp; invites are coming next.</EmptyState>
    </div>
  );
}
