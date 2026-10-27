"use client";

import { AppError } from "@/components/app/AppError";

export default function TubError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppError error={error} reset={reset} title="Add tub failed to load" />
  );
}
