"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useSession } from "@/hooks/useSession";
import { apiClient } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// SVG User Icon (large, for profile)
function UserAvatarLarge({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-4xl select-none">
      {initials || (
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-16">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      )}
    </div>
  );
}

const roleBadge: Record<string, { label: string; cls: string }> = {
  admin:    { label: "Admin",    cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  manager:  { label: "Manager",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  employee: { label: "Employee", cls: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

export default function ProfilePage() {
  const { data: sessionData } = useSession();
  const router = useRouter();

  const user = (sessionData as any)?.user || sessionData;
  const name   = user?.name   || "User";
  const email  = user?.email  || "";
  const userId = user?.userId || "";
  const role   = user?.role   || "employee";
  const badge  = roleBadge[role] || roleBadge.employee;

  // Change password state
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Lock Screen state
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockTimeout, setLockTimeout] = useState(5);
  const [hasPin, setHasPin] = useState(false);
  const [pinVal, setPinVal] = useState("");
  const [pinConfirmVal, setPinConfirmVal] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [lockMsg, setLockMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Fetch lock status on mount
  useEffect(() => {
    fetch("/api/lock/status")
      .then((r) => r.json())
      .then((data) => {
        setLockEnabled(data.lockEnabled ?? false);
        setLockTimeout(data.lockTimeoutMinutes ?? 5);
        setHasPin(data.hasPin ?? false);
      })
      .catch(() => {});
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ text: "New passwords do not match.", ok: false });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ text: "Password must be at least 6 characters.", ok: false });
      return;
    }
    setPwLoading(true);
    try {
      // Find current user's id from session
      const sid = user?.id;
      if (!sid) throw new Error("Session not found");
      await apiClient.patch(`/api/users/${sid}`, {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwMsg({ text: "Password changed successfully!", ok: true });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setPwMsg({ text: err?.message || "Failed to change password.", ok: false });
    } finally {
      setPwLoading(false);
      setTimeout(() => setPwMsg(null), 4000);
    }
  };

  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(pinVal)) {
      setLockMsg({ text: "PIN must be exactly 4 digits.", ok: false });
      setTimeout(() => setLockMsg(null), 3000);
      return;
    }
    if (pinVal !== pinConfirmVal) {
      setLockMsg({ text: "PINs do not match.", ok: false });
      setTimeout(() => setLockMsg(null), 3000);
      return;
    }
    setPinSaving(true);
    try {
      await apiClient.post("/api/lock/set-pin", { pin: pinVal });
      setHasPin(true);
      setLockEnabled(true);
      setPinVal("");
      setPinConfirmVal("");
      setLockMsg({ text: "PIN set! Lock screen is now enabled.", ok: true });
    } catch {
      setLockMsg({ text: "Failed to set PIN.", ok: false });
    } finally {
      setPinSaving(false);
      setTimeout(() => setLockMsg(null), 4000);
    }
  };

  const handleToggleLock = async (enabled: boolean) => {
    setLockEnabled(enabled);
    try {
      await apiClient.put("/api/lock/settings", { lockEnabled: enabled });
    } catch {
      setLockEnabled(!enabled);
    }
  };

  const handleTimeoutChange = async (minutes: number) => {
    setLockTimeout(minutes);
    try {
      await apiClient.put("/api/lock/settings", { lockTimeoutMinutes: minutes });
    } catch { /* revert silently */ }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/sign-in";
  };

  const inputCls = "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

  return (
    <div className="mx-auto w-full max-w-[970px] space-y-6">
      <Breadcrumb pageName="Profile" />

      {/* Profile Card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-dark">
        {/* Cover */}
        <div className="h-24 sm:h-36 bg-gradient-to-r from-blue-600 to-indigo-600 md:h-52" />

        {/* Avatar + Info */}
        <div className="px-4 sm:px-6 pb-6 sm:pb-8 text-center">
          <div className="relative mx-auto -mt-12 sm:-mt-16 mb-3 sm:mb-4 h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-white bg-white p-0.5 shadow-lg dark:border-gray-dark dark:bg-gray-dark">
            <UserAvatarLarge name={name} />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{name}</h1>
          {email && <p className="mt-1 text-gray-500">{email}</p>}
          <p className="mt-1 text-sm text-gray-400">@{userId}</p>

          <div className="mt-3 flex items-center justify-center gap-3">
            <span className={`rounded-full px-4 py-1 text-sm font-medium capitalize ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-dark">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Account Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-500">Full Name</label>
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">{name}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-500">User ID (login)</label>
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">@{userId}</p>
          </div>
          {email && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-500">Email</label>
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">{email}</p>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-500">Role</label>
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white capitalize">{role}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-dark">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
        <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
          {pwMsg && (
            <div className={`rounded-lg px-4 py-2.5 text-sm ${pwMsg.ok ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
              {pwMsg.text}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
            <input type="password" className={inputCls} value={pwForm.currentPassword}
              onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
            <input type="password" className={inputCls} value={pwForm.newPassword}
              onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
            <input type="password" className={inputCls} value={pwForm.confirmPassword}
              onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
          </div>
          <button type="submit" disabled={pwLoading}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {pwLoading ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>

      {/* Lock Screen */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-dark">
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Lock Screen</h2>
        <p className="mb-5 text-sm text-gray-500">Set a PIN to automatically lock the screen when idle</p>

        {lockMsg && (
          <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${lockMsg.ok ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
            {lockMsg.text}
          </div>
        )}

        <div className="max-w-md space-y-5">
          {/* Set / Update PIN */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{hasPin ? "Update PIN" : "Set PIN"}</h3>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">PIN (4 digits)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className={inputCls}
                value={pinVal}
                onChange={(e) => setPinVal(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 4-digit PIN"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className={inputCls}
                value={pinConfirmVal}
                onChange={(e) => setPinConfirmVal(e.target.value.replace(/\D/g, ""))}
                placeholder="Re-enter PIN"
              />
            </div>
            <button
              onClick={handleSetPin}
              disabled={pinSaving || pinVal.length < 4}
              className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {pinSaving ? "Saving..." : hasPin ? "Update PIN" : "Set PIN"}
            </button>
          </div>

          {/* Enable/Disable toggle */}
          {hasPin && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Lock Screen</span>
              <button
                onClick={() => handleToggleLock(!lockEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  lockEnabled ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  lockEnabled ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
          )}

          {/* Timeout */}
          {hasPin && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Lock after idle</label>
              <select
                className={inputCls}
                value={lockTimeout}
                onChange={(e) => handleTimeoutChange(Number(e.target.value))}
              >
                <option value={2}>2 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Sign Out */}
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/10">
        <h2 className="mb-1 text-lg font-semibold text-red-800 dark:text-red-400">Sign Out</h2>
        <p className="mb-4 text-sm text-red-600 dark:text-red-300">You will be redirected to the login page.</p>
        <button onClick={handleLogout}
          className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700">
          Sign Out
        </button>
      </div>
    </div>
  );
}

