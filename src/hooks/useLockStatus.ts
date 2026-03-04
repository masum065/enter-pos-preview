"use client";

import { useState, useEffect, useCallback } from "react";

interface LockStatus {
  lockEnabled: boolean;
  lockTimeoutMinutes: number;
  hasPin: boolean;
  isUnlocked: boolean;
}

// Global cache to avoid duplicate API calls from Header + LockWrapper
let cachedStatus: LockStatus | null = null;
let fetchPromise: Promise<LockStatus> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5000; // 5 seconds

async function fetchLockStatusOnce(): Promise<LockStatus> {
  const now = Date.now();

  // Return cached if fresh
  if (cachedStatus && now - lastFetchTime < CACHE_TTL) {
    return cachedStatus;
  }

  // Deduplicate in-flight requests
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/lock/status")
    .then((r) => r.json())
    .then((data) => {
      cachedStatus = {
        lockEnabled: data.lockEnabled ?? false,
        lockTimeoutMinutes: data.lockTimeoutMinutes ?? 5,
        hasPin: data.hasPin ?? false,
        isUnlocked: data.isUnlocked ?? false,
      };
      lastFetchTime = Date.now();
      fetchPromise = null;
      return cachedStatus;
    })
    .catch(() => {
      fetchPromise = null;
      return cachedStatus || { lockEnabled: false, lockTimeoutMinutes: 5, hasPin: false, isUnlocked: false };
    });

  return fetchPromise;
}

/** Invalidate the cache (call after changing lock settings) */
export function invalidateLockStatus() {
  cachedStatus = null;
  lastFetchTime = 0;
}

/** Shared hook — Header + LockWrapper both use this, but only 1 API call fires */
export function useLockStatus() {
  const [status, setStatus] = useState<LockStatus | null>(cachedStatus);
  const [loaded, setLoaded] = useState(!!cachedStatus);

  const refresh = useCallback(async () => {
    invalidateLockStatus();
    const s = await fetchLockStatusOnce();
    setStatus(s);
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchLockStatusOnce().then((s) => {
      setStatus(s);
      setLoaded(true);
    });
  }, []);

  return { status, loaded, refresh };
}
