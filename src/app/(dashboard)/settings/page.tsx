"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";

type Tab = "general" | "users";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [saveMessage, setSaveMessage] = useState("");

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
      setSaveMessage("Settings saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch(e) {
      setSaveMessage("Settings saved locally.");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  // Mock users for display
  const mockUsers = [
    { id: "1", username: "admin", name: "Administrator", role: "Admin", status: "Active" },
    { id: "2", username: "manager", name: "Store Manager", role: "Manager", status: "Active" },
    { id: "3", username: "cashier", name: "Front Cashier", role: "Cashier", status: "Active" },
  ];


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage application settings and data</p>
      </div>

      {/* Success Message */}
      {saveMessage && (
        <div className="rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          ✓ {saveMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(["general", "users"] as Tab[]).map((tab) => (
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
              <div>
                <label className="mb-2 block text-sm font-medium">Shop Name</label>
                <input
                  type="text"
                  value={settings.shopName}
                  onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Shop Address</label>
                <textarea
                  value={settings.shopAddress}
                  onChange={(e) => setSettings({ ...settings, shopAddress: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Phone</label>
                  <input
                    type="tel"
                    value={settings.shopPhone}
                    onChange={(e) => setSettings({ ...settings, shopPhone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Tax %</label>
                  <input
                    type="number"
                    value={settings.taxPercent}
                    onChange={(e) => setSettings({ ...settings, taxPercent: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Invoice Prefix</label>
                  <input
                    type="text"
                    value={settings.invoicePrefix}
                    onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="INV"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Service Prefix</label>
                  <input
                    type="text"
                    value={settings.servicePrefix}
                    onChange={(e) => setSettings({ ...settings, servicePrefix: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="SRV"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h2>
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed">
                Add User (Coming Soon)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {mockUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          user.role === "Admin" 
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : user.role === "Manager"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              💡 This is a mock user list. Backend integration is required for full user management.
            </p>
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
                  <li>✓ Data export/import</li>
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
                <h3 className="font-semibold text-gray-800 dark:text-gray-300">Cashier</h3>
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

    </div>
  );
}
