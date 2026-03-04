"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LockScreenUI } from "./LockScreenUI";
import { useLockStatus, invalidateLockStatus } from "@/hooks/useLockStatus";
import { useSession } from "@/hooks/useSession";

export function LockWrapper({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const { status: lockStatus, loaded } = useLockStatus();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const { data: sessionData } = useSession();

  const userName = (sessionData as any)?.user?.name || (sessionData as any)?.name || "User";

  // Lock immediately if status says so
  useEffect(() => {
    if (lockStatus?.lockEnabled && lockStatus?.hasPin && !lockStatus?.isUnlocked) {
      setIsLocked(true);
    }
  }, [lockStatus]);

  // Reset idle timer (called on activity)
  const resetTimer = useCallback(() => {
    if (!lockStatus?.lockEnabled || !lockStatus?.hasPin) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const timeoutMs = (lockStatus.lockTimeoutMinutes || 5) * 60 * 1000;

    timerRef.current = setTimeout(() => {
      setIsLocked(true);
      fetch("/api/lock/expire", { method: "POST" }).catch(() => {});
    }, timeoutMs);
  }, [lockStatus]);

  // Monitor user activity with THROTTLING (max 1 reset per 2 seconds)
  useEffect(() => {
    if (!lockStatus?.lockEnabled || !lockStatus?.hasPin || isLocked) return;

    const THROTTLE_MS = 2000;
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > THROTTLE_MS) {
        lastActivityRef.current = now;
        resetTimer();
      }
    };

    // Start the initial timer
    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [lockStatus, isLocked, resetTimer]);

  // Handle unlock
  const handleUnlock = useCallback(() => {
    setIsLocked(false);
    invalidateLockStatus();
  }, []);

  // ── Render Logic ─────────────────────────────────────────────────
  // Check BOTH: isLocked (from idle timer) OR !isUnlocked (from API/cookie)
  // This prevents the flash: we don't wait for useEffect to set isLocked,
  // we read the API status directly in the same render cycle.
  const shouldLock = lockStatus?.lockEnabled && lockStatus?.hasPin &&
    (isLocked || !lockStatus?.isUnlocked);

  // Loading → blank screen with spinner
  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#020d1a]">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  // Locked → only lock screen (no children = no bypass)
  if (shouldLock) {
    return <LockScreenUI userName={userName} onUnlock={handleUnlock} />;
  }

  // Unlocked → app
  return <>{children}</>;
}
