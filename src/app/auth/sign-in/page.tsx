"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleLogin = async () => {
    console.log("handleLogin called, userId:", userId);
    setShowError(false);
    setIsLoading(true);

    try {
      console.log("Calling login API...");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (response.ok && data.success) {
        console.log("Login successful, redirecting to /");
        window.location.href = "/";
      } else {
        console.log("Login failed:", data.error);
        setShowError(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setShowError(true);
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (role: "admin" | "manager" | "employee") => {
    const userMap = {
      admin: { userId: "admin", password: "admin123" },
      manager: { userId: "manager", password: "manager123" },
      employee: { userId: "employee", password: "employee123" },
    };
    
    setUserId(userMap[role].userId);
    setPassword(userMap[role].password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md px-4">
        {/* Logo & Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-3xl font-bold text-white shadow-lg">
            EC
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enter Computer POS</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="space-y-4">
            {/* Error Message */}
            {showError && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                Invalid user ID or password. Please try again.
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Enter user ID"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading || !userId || !password}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </div>

          {/* Quick Login */}
          <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <p className="mb-3 text-center text-sm text-gray-500 dark:text-gray-400">
              Quick Login (Demo Accounts)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin")}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("manager")}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-400"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("employee")}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              >
                Employee
              </button>
            </div>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="mb-2 text-sm font-medium text-blue-800 dark:text-blue-300">Demo Credentials:</p>
          <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
            <li><span className="font-medium">Admin:</span> admin / admin123</li>
            <li><span className="font-medium">Manager:</span> manager / manager123</li>
            <li><span className="font-medium">Employee:</span> employee / employee123</li>
          </ul>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          © 2026 Enter Computer. All rights reserved.
        </p>
      </div>
    </div>
  );
}
