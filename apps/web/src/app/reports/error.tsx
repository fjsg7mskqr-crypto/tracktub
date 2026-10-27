"use client";

import { AppError } from "@/components/app/AppError";

export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppError error={error} reset={reset} title="Reports failed to load" />
  );
}
