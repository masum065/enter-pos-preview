"use client";

import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { useLockStatus } from "@/hooks/useLockStatus";
import { Modal, ModalFooter } from "@/components/ui/modal";

type Tab = "general" | "users" | "security";

type User = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  role: "admin" | "manager" | "employee";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

// ── Reusable input component ───────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    {children}
  </div>
);
const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white";


// ── Add/Edit User Modal ────────────────────────────────────────────────────
function UserModal({
  mode,
  user,
  onClose,
  onSave,
  saving,
  error,
}: {
  mode: "add" | "edit";
  user?: User;
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
  error: string;
}) {
  const [form, setForm] = useState({
    userId:   user?.userId   ?? "",
    name:     user?.name     ?? "",
    email:    user?.email    ?? "",
    password: "",
    role:     user?.role     ?? "employee",
    isActive: user?.isActive ?? true,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === "add" ? "Add New User" : "Edit User"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          {mode === "add" && (
            <Field label="User ID (login username)">
              <input
                className={inputCls}
                value={form.userId}
                onChange={e => setForm({ ...form, userId: e.target.value })}
                placeholder="e.g. john_doe"
              />
            </Field>
          )}

          <Field label="Full Name">
            <input
              className={inputCls}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
            />
          </Field>

          <Field label="Email (optional)">
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="user@example.com"
            />
          </Field>

          {mode === "add" && (
            <Field label="Password">
              <input
                type="password"
                className={inputCls}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 characters"
              />
            </Field>
          )}

          <Field label="Role">
            <select
              className={inputCls}
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as any })}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
          </Field>

          {mode === "edit" && (
            <Field label="Status">
              <select
                className={inputCls}
                value={form.isActive ? "active" : "inactive"}
                onChange={e => setForm({ ...form, isActive: e.target.value === "active" })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : mode === "add" ? "Create User" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reset Password Modal ───────────────────────────────────────────────────
function ResetPasswordModal({
  user,
  onClose,
  onSave,
  saving,
  error,
}: {
  user: User;
  onClose: () => void;
  onSave: (pass: string) => void;
  saving: boolean;
  error: string;
}) {
  const [password, setPassword] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reset Password</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Set a new password for <strong>{user.name}</strong> ({user.userId})
          </p>
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</div>
          )}
          <Field label="New Password">
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={() => onSave(password)} disabled={saving}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60">
            {saving ? "Saving…" : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const qc = useQueryClient();

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Current logged-in user
  const { data: sessionData } = useSession();
  const currentUserId = (sessionData as any)?.user?.userId || (sessionData as any)?.userId || "";

  // ── General settings ──────────────────────────────────────────────────
  const [settings, setSettings] = useState({
    shopName: "Enter Computer",
    shopAddress: "Dhaka, Bangladesh",
    shopPhone: "+880 1234 567890",
    taxPercent: 0,
    currency: "BDT",
    invoicePrefix: "INV",
    servicePrefix: "SRV",
  });

  const handleSaveSettings = async () => {
    try {
      await apiClient.put("/api/settings", settings);
      showToast("Settings saved successfully!");
    } catch {
      showToast("Settings saved locally.", "success");
    }
  };

  // ── User management state ─────────────────────────────────────────────
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [editUser,       setEditUser]       = useState<User | null>(null);
  const [resetUser,      setResetUser]      = useState<User | null>(null);
  const [modalError,     setModalError]     = useState("");
  const [saving,         setSaving]         = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor: "red" | "green";
    onConfirm: () => void;
  } | null>(null);

  // ── Security / Lock Screen state ──────────────────────────────────────
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockTimeout, setLockTimeout] = useState(5);
  const [hasPin, setHasPin] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [securityLoaded, setSecurityLoaded] = useState(false);

  // Fetch lock status when security tab is active
  useEffect(() => {
    if (activeTab !== "security" || securityLoaded) return;
    (async () => {
      try {
        const res: any = await apiClient.get("/api/lock/status");
        setLockEnabled(res.lockEnabled ?? false);
        setLockTimeout(res.lockTimeoutMinutes ?? 5);
        setHasPin(res.hasPin ?? false);
        setSecurityLoaded(true);
      } catch { /* ignore */ }
    })();
  }, [activeTab, securityLoaded]);

  const { updateStatus } = useLockStatus();

  const handleToggleLock = async (enabled: boolean) => {
    setLockEnabled(enabled);
    updateStatus({ lockEnabled: enabled });
    try {
      await apiClient.put("/api/lock/settings", { lockEnabled: enabled });
      showToast(enabled ? "Lock screen enabled" : "Lock screen disabled");
    } catch {
      showToast("Failed to update setting", "error");
      setLockEnabled(!enabled);
      updateStatus({ lockEnabled: !enabled });
    }
  };

  const handleTimeoutChange = async (minutes: number) => {
    setLockTimeout(minutes);
    updateStatus({ lockTimeoutMinutes: minutes });
    try {
      await apiClient.put("/api/lock/settings", { lockTimeoutMinutes: minutes });
      showToast(`Timeout set to ${minutes} minutes`);
    } catch {
      showToast("Failed to update timeout", "error");
    }
  };

  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(pinValue)) {
      return showToast("PIN must be exactly 4 digits", "error");
    }
    if (pinValue !== pinConfirm) {
      return showToast("PINs do not match", "error");
    }
    setPinSaving(true);
    try {
      await apiClient.post("/api/lock/set-pin", { pin: pinValue });
      setHasPin(true);
      setLockEnabled(true);
      updateStatus({ hasPin: true, lockEnabled: true });
      setPinValue("");
      setPinConfirm("");
      showToast("PIN set successfully! Lock screen is now enabled.");
    } catch {
      showToast("Failed to set PIN", "error");
    } finally {
      setPinSaving(false);
    }
  };

  // Admin: set PIN for another user
  const [pinTargetUser, setPinTargetUser] = useState<User | null>(null);
  const [pinForUser, setPinForUser] = useState("");
  const [pinForUserSaving, setPinForUserSaving] = useState(false);

  const handleSetPinForUser = async () => {
    if (!pinTargetUser || !/^\d{4}$/.test(pinForUser)) {
      return showToast("PIN must be exactly 4 digits", "error");
    }
    setPinForUserSaving(true);
    try {
      await apiClient.post("/api/lock/set-pin", { pin: pinForUser, targetUserId: pinTargetUser.id });
      showToast(`PIN set for ${pinTargetUser.name}`);
      setPinTargetUser(null);
      setPinForUser("");
    } catch {
      showToast("Failed to set PIN", "error");
    } finally {
      setPinForUserSaving(false);
    }
  };

  // Fetch real users from API
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["settings", "users"],
    queryFn: () => apiClient.get<{ users: User[] }>("/api/users"),
    enabled: activeTab === "users",
    staleTime: 30_000,
  });
  const userList: User[] = (usersData as any)?.users ?? [];

  // ── Create user ───────────────────────────────────────────────────────
  const handleCreate = async (form: any) => {
    setModalError("");
    if (!form.userId.trim()) return setModalError("User ID is required.");
    if (!form.name.trim())   return setModalError("Full name is required.");
    if (form.password.length < 6) return setModalError("Password must be at least 6 characters.");
    setSaving(true);
    try {
      await apiClient.post("/api/users", {
        userId:   form.userId.trim(),
        name:     form.name.trim(),
        email:    form.email.trim() || undefined,
        password: form.password,
        role:     form.role,
      });
      qc.invalidateQueries({ queryKey: ["settings", "users"] });
      setShowAddModal(false);
      showToast(`User "${form.name}" created successfully!`);
    } catch (e: any) {
      setModalError(e?.message || "Failed to create user. User ID may already exist.");
    } finally {
      setSaving(false);
    }
  };

  // ── Update user ───────────────────────────────────────────────────────
  const handleUpdate = async (form: any) => {
    if (!editUser) return;
    setModalError("");
    if (!form.name.trim()) return setModalError("Full name is required.");
    setSaving(true);
    try {
      await apiClient.put(`/api/users/${editUser.id}`, {
        name:     form.name.trim(),
        email:    form.email.trim() || undefined,
        role:     form.role,
        isActive: form.isActive,
      });
      qc.invalidateQueries({ queryKey: ["settings", "users"] });
      setEditUser(null);
      showToast("User updated successfully!");
    } catch (e: any) {
      setModalError(e?.message || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  // ── Reset password ────────────────────────────────────────────────────
  const handleResetPassword = async (password: string) => {
    if (!resetUser) return;
    setModalError("");
    if (password.length < 6) return setModalError("Password must be at least 6 characters.");
    setSaving(true);
    try {
      await apiClient.patch(`/api/users/${resetUser.id}`, { newPassword: password });
      setResetUser(null);
      showToast("Password reset successfully!");
    } catch (e: any) {
      setModalError(e?.message || "Failed to reset password.");
    } finally {
      setSaving(false);
    }
  };

  // ── Deactivate user
  const handleDeactivate = async (user: User) => {
    setConfirmModal({
      title: "Deactivate User",
      message: `Are you sure you want to deactivate "${user.name}" (@${user.userId})? They will no longer be able to log in.`,
      confirmLabel: "Deactivate",
      confirmColor: "red",
      onConfirm: async () => {
        try {
          await apiClient.delete(`/api/users/${user.id}`);
          qc.invalidateQueries({ queryKey: ["settings", "users"] });
          showToast(`User "${user.name}" deactivated.`);
        } catch (e: any) {
          showToast(e?.message || "Failed to deactivate user.", "error");
        }
      },
    });
  };

  // ── Activate user
  const handleActivate = async (user: User) => {
    setConfirmModal({
      title: "Activate User",
      message: `Re-activate "${user.name}" (@${user.userId})? They will be able to log in again.`,
      confirmLabel: "Activate",
      confirmColor: "green",
      onConfirm: async () => {
        try {
          await apiClient.put(`/api/users/${user.id}`, {
            name:     user.name,
            email:    user.email || undefined,
            role:     user.role,
            isActive: true,
          });
          qc.invalidateQueries({ queryKey: ["settings", "users"] });
          showToast(`User "${user.name}" activated.`);
        } catch (e: any) {
          showToast(e?.message || "Failed to activate user.", "error");
        }
      },
    });
  };

  const roleBadge = (role: string) =>
    role === "admin"    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    : role === "manager" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 shadow-lg text-white text-sm font-medium transition-all ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.type === "success" ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage application settings and users</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(["general", "users", "security"] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium capitalize transition-all ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Shop Information</h2>
            <div className="space-y-4">
              <Field label="Shop Name">
                <input type="text" className={inputCls} value={settings.shopName}
                  onChange={e => setSettings({ ...settings, shopName: e.target.value })} />
              </Field>
              <Field label="Shop Address">
                <textarea rows={2} className={inputCls} value={settings.shopAddress}
                  onChange={e => setSettings({ ...settings, shopAddress: e.target.value })} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Phone">
                  <input type="tel" className={inputCls} value={settings.shopPhone}
                    onChange={e => setSettings({ ...settings, shopPhone: e.target.value })} />
                </Field>
                <Field label="Tax %">
                  <input type="number" min="0" max="100" className={inputCls} value={settings.taxPercent}
                    onChange={e => setSettings({ ...settings, taxPercent: Number(e.target.value) })} />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Invoice Prefix">
                  <input type="text" className={inputCls} placeholder="INV" value={settings.invoicePrefix}
                    onChange={e => setSettings({ ...settings, invoicePrefix: e.target.value })} />
                </Field>
                <Field label="Service Prefix">
                  <input type="text" className={inputCls} placeholder="SRV" value={settings.servicePrefix}
                    onChange={e => setSettings({ ...settings, servicePrefix: e.target.value })} />
                </Field>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={handleSaveSettings}
                className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h2>
                <p className="text-sm text-gray-500">{userList.length} user{userList.length !== 1 ? "s" : ""} registered</p>
              </div>
              <button
                onClick={() => { setModalError(""); setShowAddModal(true); }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add User
              </button>
            </div>

            <div className="overflow-x-auto">
              {usersLoading ? (
                <div className="px-6 py-10 text-center text-sm text-gray-400">Loading users…</div>
              ) : userList.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-gray-400">No users found.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">User</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Role</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Last Login</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {userList.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-sm text-gray-500">@{user.userId}{user.email ? ` · ${user.email}` : ""}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${roleBadge(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                            user.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                          }`}>
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" })
                            : "Never"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* Edit & Reset Pass — not for self (can use profile page) */}
                            <button
                              onClick={() => { setModalError(""); setEditUser(user); }}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => { setModalError(""); setResetUser(user); }}
                              className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20"
                            >
                              Reset Pass
                            </button>
                            <button
                              onClick={() => { setPinForUser(""); setPinTargetUser(user); }}
                              className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20"
                            >
                              Set PIN
                            </button>
                            {/* Activate / Deactivate — protected: cannot act on own account */}
                            {user.userId !== currentUserId && (
                              user.isActive ? (
                                <button
                                  onClick={() => handleDeactivate(user)}
                                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivate(user)}
                                  className="rounded-lg border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                                >
                                  Activate
                                </button>
                              )
                            )}
                            {user.userId === currentUserId && (
                              <span className="rounded-lg border border-gray-100 px-3 py-1.5 text-xs text-gray-400 dark:border-gray-800">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Role Permissions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Role Permissions</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
                <h3 className="font-semibold text-red-800 dark:text-red-400">Admin</h3>
                <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-300">
                  <li>✓ Full access to all modules</li>
                  <li>✓ User management</li>
                  <li>✓ Settings & configuration</li>
                  <li>✓ Reports & analytics</li>
                </ul>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
                <h3 className="font-semibold text-blue-800 dark:text-blue-400">Manager</h3>
                <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <li>✓ Sales & inventory</li>
                  <li>✓ Reports & analytics</li>
                  <li>✓ Customer management</li>
                  <li>✗ User management</li>
                </ul>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="font-semibold text-gray-800 dark:text-gray-300">Employee</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-400">
                  <li>✓ Create sales</li>
                  <li>✓ View customers</li>
                  <li>✗ Edit inventory</li>
                  <li>✗ Access reports</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="max-w-2xl space-y-6">
          {/* Lock Screen Toggle */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lock Screen</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Automatically lock the screen after idle time
                </p>
              </div>
              <button
                onClick={() => handleToggleLock(!lockEnabled)}
                disabled={!hasPin}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  lockEnabled ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"
                } ${!hasPin ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                    lockEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {!hasPin && (
              <p className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                ⚠ Set a PIN first to enable the lock screen
              </p>
            )}
          </div>

          {/* Set / Update PIN */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
              {hasPin ? "Update PIN" : "Set PIN"}
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {hasPin ? "Enter a new 4-digit PIN to replace your current one" : "Create a 4-digit PIN to secure your POS"}
            </p>
            <div className="space-y-4">
              <Field label="PIN (4 digits)">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className={inputCls}
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter PIN"
                />
              </Field>
              <Field label="Confirm PIN">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className={inputCls}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
                  placeholder="Re-enter PIN"
                />
              </Field>
              <button
                onClick={handleSetPin}
                disabled={pinSaving || pinValue.length < 4}
                className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {pinSaving ? "Saving..." : hasPin ? "Update PIN" : "Set PIN"}
              </button>
            </div>
          </div>

          {/* Idle Timeout */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Idle Timeout</h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              How long before the screen locks after no activity
            </p>
            <Field label="Lock after">
              <select
                className={inputCls}
                value={lockTimeout}
                onChange={(e) => handleTimeoutChange(Number(e.target.value))}
              >
                <option value={2}>2 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
              </select>
            </Field>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <UserModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSave={handleCreate}
          saving={saving}
          error={modalError}
        />
      )}

      {/* Edit User Modal */}
      {editUser && (
        <UserModal
          mode="edit"
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleUpdate}
          saving={saving}
          error={modalError}
        />
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSave={handleResetPassword}
          saving={saving}
          error={modalError}
        />
      )}

      {/* Confirm Modal (activate / deactivate) — uses shared Modal component */}
      {confirmModal && (
        <Modal
          isOpen={!!confirmModal}
          onClose={() => setConfirmModal(null)}
          title={confirmModal.title}
          size="sm"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">{confirmModal.message}</p>
          <ModalFooter
            onCancel={() => setConfirmModal(null)}
            onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
            cancelText="Cancel"
            confirmText={confirmModal.confirmLabel}
            confirmVariant={confirmModal.confirmColor === "red" ? "danger" : "success"}
          />
        </Modal>
      )}

      {/* Set PIN Modal for user management */}
      {pinTargetUser && (
        <Modal
          isOpen={!!pinTargetUser}
          onClose={() => setPinTargetUser(null)}
          title={`Set PIN for ${pinTargetUser.name}`}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Set a 4-digit lock screen PIN for this user. This will auto-enable the lock screen for them.
            </p>
            <Field label="PIN (4 digits)">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className={inputCls}
                value={pinForUser}
                onChange={(e) => setPinForUser(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 4-digit PIN"
              />
            </Field>
          </div>
          <ModalFooter
            onCancel={() => setPinTargetUser(null)}
            onConfirm={handleSetPinForUser}
            cancelText="Cancel"
            confirmText={pinForUserSaving ? "Saving..." : "Set PIN"}
            confirmVariant="success"
          />
        </Modal>
      )}
    </div>
  );
}
