"use client";

import { AppError } from "@/components/app/AppError";

export default function VisitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppError error={error} reset={reset} title="Visit failed to load" />;
}
