"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText, className = "btn btn-primary btn-block", disabled }: { children: React.ReactNode; pendingText?: string; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? (pendingText ?? "처리 중...") : children}
    </button>
  );
}
