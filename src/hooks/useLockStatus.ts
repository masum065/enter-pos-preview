"use client";

import { create } from "zustand";

interface LockStatus {
  lockEnabled: boolean;
  lockTimeoutMinutes: number;
  hasPin: boolean;
  isUnlocked: boolean;
}

interface LockStore {
  status: LockStatus | null;
  loaded: boolean;
  fetchPromise: Promise<LockStatus> | null;
  refresh: () => Promise<void>;
  updateStatus: (updates: Partial<LockStatus>) => void;
}

export const useLockStore = create<LockStore>((set, get) => ({
  status: null,
  loaded: false,
  fetchPromise: null,

  refresh: async () => {
    const state = get();
    if (state.fetchPromise) {
      await state.fetchPromise;
      return;
    }

    const promise = fetch("/api/lock/status")
      .then((r) => r.json())
      .then((data) => {
        const newStatus = {
          lockEnabled: data.lockEnabled ?? false,
          lockTimeoutMinutes: data.lockTimeoutMinutes ?? 5,
          hasPin: data.hasPin ?? false,
          isUnlocked: data.isUnlocked ?? false,
        };
        set({ status: newStatus, loaded: true, fetchPromise: null });
        return newStatus;
      })
      .catch(() => {
        const fallback = { lockEnabled: false, lockTimeoutMinutes: 5, hasPin: false, isUnlocked: false };
        set({ status: fallback, loaded: true, fetchPromise: null });
        return fallback;
      });

    set({ fetchPromise: promise });
    await promise;
  },

  updateStatus: (updates) =>
    set((state) => ({
      status: state.status
        ? { ...state.status, ...updates }
        : { lockEnabled: false, lockTimeoutMinutes: 5, hasPin: false, isUnlocked: false, ...updates },
    })),
}));

export function invalidateLockStatus() {
  useLockStore.setState({ loaded: false });
}

export function useLockStatus() {
  const status = useLockStore((state) => state.status);
  const loaded = useLockStore((state) => state.loaded);
  const refresh = useLockStore((state) => state.refresh);
  const updateStatus = useLockStore((state) => state.updateStatus);

  if (!loaded && typeof window !== "undefined" && !useLockStore.getState().fetchPromise) {
    refresh();
  }

  return { status, loaded, refresh, updateStatus };
}
