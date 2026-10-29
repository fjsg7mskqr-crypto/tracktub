import { BackBone, Bone } from "@/components/app/Skeleton";
import "./record.css";

/**
 * A record (or a history report of records) while it loads: the dark operator
 * bar, then the white paper page with its header, photos and readings as
 * light blocks. Used by the records and history `loading.tsx`.
 */
export function RecordSkeleton({ label }: { label: string }) {
  return (
    <div className="tt-record-page" aria-busy="true" aria-label={label}>
      <div className="tt-record-operator">
        <BackBone w={90} />
      </div>
      <div className="tt-record">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Bone w={120} h={12} r={4} tone="paper" />
          <Bone w={240} h={28} r={8} tone="paper" />
          <Bone w={180} h={14} r={5} tone="paper" />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <Bone h={150} r={14} tone="paper" />
          <Bone h={150} r={14} tone="paper" />
        </div>
        <Bone h={120} r={14} tone="paper" />
      </div>
    </div>
  );
}
