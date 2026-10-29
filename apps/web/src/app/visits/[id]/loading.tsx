import { BackBone, Bone, SkeletonScreen } from "@/components/app/Skeleton";

// A visit while it loads: back to the tub, the heading, the photo tiles and the
// numbered sections below.
export default function Loading() {
  return (
    <SkeletonScreen label="Loading visit" gap={32} top={16}>
      <BackBone w={120} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Bone w={210} h={30} r={8} />
        <Bone h={15} r={5} />
      </div>
      {[0, 1].map((s) => (
        <section
          key={s}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <Bone w={170} h={18} r={6} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <Bone h={150} r="var(--tt-radius-tile)" />
            <Bone h={150} r="var(--tt-radius-tile)" />
          </div>
        </section>
      ))}
    </SkeletonScreen>
  );
}
