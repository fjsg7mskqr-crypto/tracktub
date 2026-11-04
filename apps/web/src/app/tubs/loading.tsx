import {
  Bone,
  LabelBone,
  RowBones,
  SkeletonScreen,
  SkeletonTitle,
} from "@/components/app/Skeleton";

// Tubs while it loads: the title and Add tub, then a client group of rows.
export default function Loading() {
  return (
    <SkeletonScreen label="Loading tubs">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <SkeletonTitle>Tubs</SkeletonTitle>
        <Bone w={112} h="var(--tt-tap)" r={999} tone="raised" />
      </div>
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <LabelBone w={150} />
        <RowBones count={3} />
      </section>
    </SkeletonScreen>
  );
}
