import {
  BackBone,
  Bone,
  LabelBone,
  RowBones,
  SkeletonScreen,
} from "@/components/app/Skeleton";

// One tub while it loads: back link, name, "Before you go in" tiles, the log.
export default function Loading() {
  return (
    <SkeletonScreen label="Loading tub" gap={26} top={16}>
      <BackBone w={60} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Bone w={220} h={32} r={8} />
        <Bone w={180} h={15} r={5} />
      </div>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <LabelBone w={120} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} h={84} r="var(--tt-radius-tile)" />
          ))}
        </div>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <LabelBone w={40} />
        <RowBones count={3} h={72} />
      </section>
    </SkeletonScreen>
  );
}
