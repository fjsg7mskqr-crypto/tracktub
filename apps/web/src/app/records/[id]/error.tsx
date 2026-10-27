"use client";

import { AppError } from "@/components/app/AppError";

export default function RecordError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppError error={error} reset={reset} title="Record failed to load" />;
}
