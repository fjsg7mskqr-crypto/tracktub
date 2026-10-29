import {
  BackBone,
  Bone,
  SkeletonScreen,
  SkeletonTitle,
} from "@/components/app/Skeleton";

// Add tub while the client list loads: the form's fields as blocks.
export default function Loading() {
  return (
    <SkeletonScreen label="Loading add tub" top={16}>
      <BackBone w={60} />
      <SkeletonTitle>Add tub</SkeletonTitle>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <Bone w={90} h={13} r={4} />
          <Bone h={48} r={14} />
        </div>
      ))}
    </SkeletonScreen>
  );
}
