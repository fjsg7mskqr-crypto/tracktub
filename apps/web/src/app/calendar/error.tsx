"use client";

import { AppError } from "@/components/app/AppError";

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppError error={error} reset={reset} title="Calendar failed to load" />
  );
}
