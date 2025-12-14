"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { POSOverviewCards } from "./_components/pos-overview-cards";

// Dynamically import chart components to avoid SSR issues with Zustand
const PaymentsOverview = dynamic(
  () => import("@/components/Charts/payments-overview").then((mod) => mod.PaymentsOverview),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const WeeksProfit = dynamic(
  () => import("@/components/Charts/weeks-profit").then((mod) => mod.WeeksProfit),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const UsedDevices = dynamic(
  () => import("@/components/Charts/used-devices").then((mod) => mod.UsedDevices),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

// Skeleton components
function ChartSkeleton() {
  return (
    <div className="h-80 animate-pulse rounded-[10px] bg-gray-200 dark:bg-gray-700" />
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-[10px] bg-gray-200 dark:bg-gray-700" />
      ))}
    </div>
  );
}

// Quick Actions Component
function QuickActions() {
  const actions = [
    { label: "New Sale", href: "/sales/new", color: "from-green-500 to-emerald-600", icon: "📝" },
    { label: "Add Stock", href: "/inventory/stock/add", color: "from-blue-500 to-indigo-600", icon: "📦" },
    { label: "New Service", href: "/services/new", color: "from-purple-500 to-pink-600", icon: "🔧" },
    { label: "Add Expense", href: "/expenses/new", color: "from-orange-500 to-red-600", icon: "💰" },
  ];

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
      <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map((action) => (
          <a
            key={action.label}
            href={action.href}
            className={`flex flex-col items-center justify-center rounded-xl bg-gradient-to-r ${action.color} p-4 text-white shadow-md transition-transform hover:scale-105`}
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="mt-2 text-sm font-medium">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// Recent Activity Component
function RecentActivity() {
  // This will be populated from stores in the future
  const activities = [
    { type: "sale", text: "New sale INV-2024-0030 - ৳145,000", time: "2 min ago", icon: "💳" },
    { type: "stock", text: "Added 3 new MacBook Pro units", time: "15 min ago", icon: "📦" },
    { type: "service", text: "Service SRV-2024-0018 completed", time: "1 hour ago", icon: "✅" },
    { type: "customer", text: "New customer: Md. Rahim Uddin", time: "2 hours ago", icon: "👤" },
    { type: "expense", text: "Expense: Shop rent - ৳30,000", time: "5 hours ago", icon: "💰" },
  ];

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
      <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-xl">{activity.icon}</span>
            <div className="flex-1">
              <p className="text-sm text-dark dark:text-white">{activity.text}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Low Stock Alert Component
function LowStockAlert() {
  // This will be populated from stock store
  const lowStockItems = [
    { product: "MacBook Air M2", available: 2, threshold: 3 },
    { product: "iPhone 15 Pro", available: 1, threshold: 5 },
    { product: "AirPods Pro 2", available: 3, threshold: 10 },
  ];

  if (lowStockItems.length === 0) return null;

  return (
    <div className="rounded-[10px] border-l-4 border-orange-500 bg-orange-50 p-4 dark:bg-orange-900/20">
      <div className="flex items-center gap-2">
        <span className="text-xl">⚠️</span>
        <h4 className="font-semibold text-orange-800 dark:text-orange-300">Low Stock Alert</h4>
      </div>
      <ul className="mt-2 space-y-1">
        {lowStockItems.map((item, i) => (
          <li key={i} className="text-sm text-orange-700 dark:text-orange-400">
            {item.product}: only {item.available} left
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* Welcome Banner */}
      <div className="mb-6 rounded-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Welcome to Enter Computer POS</h1>
        <p className="mt-1 text-blue-100">
          Manage your laptop & mobile shop efficiently
        </p>
      </div>

      {/* Overview Cards */}
      <Suspense fallback={<CardsSkeleton />}>
        <POSOverviewCards />
      </Suspense>

      {/* Quick Actions */}
      <div className="mt-6">
        <QuickActions />
      </div>

      {/* Low Stock Alert */}
      <div className="mt-6">
        <LowStockAlert />
      </div>

      {/* Charts Section */}
      <div className="mt-6 grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-7">
          <Suspense fallback={<ChartSkeleton />}>
            <PaymentsOverview className="h-full" />
          </Suspense>
        </div>

        <div className="col-span-12 xl:col-span-5">
          <Suspense fallback={<ChartSkeleton />}>
            <WeeksProfit className="h-full" />
          </Suspense>
        </div>

        <div className="col-span-12 xl:col-span-5">
          <Suspense fallback={<ChartSkeleton />}>
            <UsedDevices className="h-full" />
          </Suspense>
        </div>

        <div className="col-span-12 xl:col-span-7">
          <RecentActivity />
        </div>
      </div>
    </>
  );
}
