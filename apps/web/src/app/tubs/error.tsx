"use client";

import { AppError } from "@/components/app/AppError";

export default function TubsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppError error={error} reset={reset} title="Tubs failed to load" />;
}
