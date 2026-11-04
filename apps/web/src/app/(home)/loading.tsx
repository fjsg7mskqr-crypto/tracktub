import { Bone, LabelBone, SkeletonScreen } from "@/components/app/Skeleton";

// Home while it loads (lives in the (home) group so the public pages under the
// root never show it): header, summary row, today's route with its focus
// card, and the status board.
export default function Loading() {
  return (
    <SkeletonScreen label="Loading home" gap={26}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Bone w={120} h={14} r={5} />
          <Bone w={200} h={30} r={8} />
        </div>
        <Bone w={44} h={44} r={999} tone="raised" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
          marginTop: -8,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Bone key={i} h={62} r="var(--tt-radius-tile)" />
        ))}
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <LabelBone w={112} />
        <Bone h={300} r="var(--tt-radius-card)" />
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <LabelBone w={104} />
        <Bone h={128} r="var(--tt-radius-tile)" />
        <Bone h={128} r="var(--tt-radius-tile)" />
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              borderRadius: "var(--tt-radius-tile)",
              background: "var(--tt-surface)",
            }}
          >
            <Bone w={46} h={46} r={999} tone="raised" />
            <Bone w="45%" h={16} r={6} tone="raised" />
          </div>
        ))}
      </section>
    </SkeletonScreen>
  );
}
