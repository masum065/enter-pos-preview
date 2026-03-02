"use client";

import type { Toast } from "@/hooks/useToast";

export function ToastNotification({ toast }: { toast: Toast | null }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg transition-all ${
        toast.type === "success" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {toast.type === "success" ? (
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {toast.msg}
    </div>
  );
}
