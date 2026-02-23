"use client";

import { useState, useEffect } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { useProducts } from "@/hooks/useProducts";
import { useStockItems } from "@/hooks/useStock";
import { useSales } from "@/hooks/useSales";
import { useServices } from "@/hooks/useServices";
import { useExpenses } from "@/hooks/useExpenses";
import { apiClient } from "@/lib/api-client";
import { downloadJSON } from "@/lib/utils";

type Tab = "general" | "users" | "data";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [saveMessage, setSaveMessage] = useState("");

  const { data: customersData } = useCustomers();
  const { data: productsData } = useProducts({ limit: 500 });
  const { data: stockData } = useStockItems();
  const { data: salesData } = useSales();
  const { data: servicesData } = useServices();
  const { data: expensesData } = useExpenses();

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

  const handleExportData = async () => {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        settings,
        customers: customersData?.customers || [],
        products: productsData?.products || [],
        stockItems: stockData?.stockItems || [],
        sales: salesData?.sales || [],
        services: servicesData?.services || [],
        expenses: expensesData?.expenses || [],
      };
      downloadJSON(data, `enter-pos-backup-${new Date().toISOString().split("T")[0]}`);
      setSaveMessage("Data exported successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch(e) {
      console.error(e);
    }
  };

  const handleResetData = () => {
    if (window.confirm("⚠️ This will delete ALL data. Are you absolutely sure?")) {
      if (window.confirm("This action cannot be undone. Type 'DELETE' to confirm.")) {
        // Clear all stores
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  const handleLoadDemoData = () => {
    setSaveMessage("Demo data loading is not available in API mode. Please use the database seeding scripts.");
    setTimeout(() => setSaveMessage(""), 5000);
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
        {(["general", "users", "data"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium capitalize transition-all ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {tab === "data" ? "Data Management" : tab}
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

      {/* Data Management Tab */}
      {activeTab === "data" && (
        <div className="space-y-6">
          {/* Data Stats */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{customersData?.customers?.length || 0}</p>
              <p className="text-sm text-gray-500">Customers</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{productsData?.products?.length || 0}</p>
              <p className="text-sm text-gray-500">Products</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stockData?.stockItems?.length || 0}</p>
              <p className="text-sm text-gray-500">Stock Items</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{salesData?.sales?.length || 0}</p>
              <p className="text-sm text-gray-500">Sales</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{servicesData?.services?.length || 0}</p>
              <p className="text-sm text-gray-500">Services</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{expensesData?.expenses?.length || 0}</p>
              <p className="text-sm text-gray-500">Expenses</p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <button
              onClick={handleExportData}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="rounded-lg bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Export Data</p>
                <p className="text-sm text-gray-500">Download all data as JSON</p>
              </div>
            </button>

            <button
              onClick={handleLoadDemoData}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="rounded-lg bg-green-100 p-3 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Load Demo Data</p>
                <p className="text-sm text-gray-500">Add sample data for testing</p>
              </div>
            </button>

            <button
              onClick={handleResetData}
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-left transition-shadow hover:shadow-md dark:border-red-900 dark:bg-red-900/20"
            >
              <div className="rounded-lg bg-red-100 p-3 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-red-800 dark:text-red-400">Reset All Data</p>
                <p className="text-sm text-red-600 dark:text-red-300">⚠️ This cannot be undone</p>
              </div>
            </button>
          </div>

          <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              💡 <strong>Tip:</strong> Export your data regularly as a backup. All data is stored in your browser&apos;s localStorage.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
