import { useState, useCallback } from "react";

export type ToastType = "success" | "error";

export interface Toast {
  msg: string;
  type: ToastType;
}

export function useToast(duration = 3500) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((msg: string, type: ToastType = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  }, [duration]);

  return { toast, showToast };
}
