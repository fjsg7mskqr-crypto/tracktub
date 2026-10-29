import {
  Bone,
  LabelBone,
  RowBones,
  SkeletonScreen,
} from "@/components/app/Skeleton";

// Home while it loads (lives in the (home) group so the public pages under the
// root never show it): header, Today card, Needs attention, This week.
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

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <LabelBone w={56} />
        <Bone h={136} r="var(--tt-radius-card)" />
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <LabelBone w={128} />
        <RowBones count={2} h={60} />
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <LabelBone w={88} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[0, 1, 2].map((i) => (
            <Bone key={i} h={78} r="var(--tt-radius-tile)" />
          ))}
        </div>
      </section>
    </SkeletonScreen>
  );
}
