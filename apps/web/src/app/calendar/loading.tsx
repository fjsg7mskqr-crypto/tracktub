import { Bone, SkeletonScreen, SkeletonTitle } from "@/components/app/Skeleton";

// Calendar while it loads: title, Day / Week / Month switch, the week's days.
export default function Loading() {
  return (
    <SkeletonScreen label="Loading calendar" gap={18}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Bone w={140} h={14} r={5} />
        <SkeletonTitle size={28}>Calendar</SkeletonTitle>
      </div>
      <Bone h={52} r={999} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Bone w={170} h={12} r={4} />
        <div style={{ display: "flex", gap: 6 }}>
          <Bone w={44} h={44} r={999} />
          <Bone w={44} h={44} r={999} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0" }}>
            <div
              style={{
                width: 44,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Bone w={24} h={11} r={4} />
              <Bone w={22} h={18} r={5} />
            </div>
            <Bone h={44} r={14} style={{ flex: 1 }} />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
