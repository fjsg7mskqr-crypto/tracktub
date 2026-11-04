import {
  BackBone,
  Bone,
  RowBones,
  SkeletonScreen,
  SkeletonTitle,
} from "@/components/app/Skeleton";

// People while it loads: back to Home, the title, the people list.
export default function Loading() {
  return (
    <SkeletonScreen label="Loading people" top={16}>
      <BackBone w={64} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <SkeletonTitle>People</SkeletonTitle>
        <Bone w={260} h={15} r={5} />
      </div>
      <RowBones count={2} h={76} />
    </SkeletonScreen>
  );
}
