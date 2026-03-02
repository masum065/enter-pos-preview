"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useSession } from "@/hooks/useSession";
import { apiClient } from "@/lib/api-client";
import { useState } from "react";
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
        <div className="h-36 bg-gradient-to-r from-blue-600 to-indigo-600 md:h-52" />

        {/* Avatar + Info */}
        <div className="px-6 pb-8 text-center">
          <div className="relative mx-auto -mt-16 mb-4 h-32 w-32 rounded-full border-4 border-white bg-white p-0.5 shadow-lg dark:border-gray-dark dark:bg-gray-dark">
            <UserAvatarLarge name={name} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h1>
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
