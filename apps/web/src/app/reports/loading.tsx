import {
  Bone,
  LabelBone,
  RowBones,
  SkeletonScreen,
  SkeletonTitle,
} from "@/components/app/Skeleton";

// Reports while it loads: the build-a-report card, then records sent.
export default function Loading() {
  return (
    <SkeletonScreen label="Loading reports">
      <SkeletonTitle>Reports</SkeletonTitle>
      <Bone h={196} r="var(--tt-radius-card)" />
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <LabelBone w={110} />
        <RowBones count={3} />
      </section>
    </SkeletonScreen>
  );
}
