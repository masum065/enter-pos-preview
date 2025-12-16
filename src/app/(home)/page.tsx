"use client";

import { Suspense, useMemo } from "react";
import { POSOverviewCards } from "./_components/pos-overview-cards";
import { useSalesStore } from "@/stores/salesStore";
import { useStockStore } from "@/stores/stockStore";
import { formatCurrency } from "@/lib/utils";

// Skeleton components
function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-[10px] bg-gray-200 dark:bg-gray-700" />
      ))}
    </div>
  );
}

// Sales Summary Card (replaces PaymentsOverview)
function SalesSummaryChart() {
  const { sales, getTodaysSales } = useSalesStore();
  const todayStats = getTodaysSales();
  
  // Get last 7 days sales
  const last7Days = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      const dayStr = date.toISOString().split("T")[0];
      
      const daySales = sales.filter(s => s.createdAt.split("T")[0] === dayStr);
      const total = daySales.reduce((sum, s) => sum + s.grandTotal, 0);
      
      data.push({ day: dayName, amount: total, count: daySales.length });
    }
    return data;
  }, [sales]);

  const totalWeekSales = last7Days.reduce((sum, d) => sum + d.amount, 0);
  const maxAmount = Math.max(...last7Days.map(d => d.amount), 1);

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark dark:text-white">Weekly Sales</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">Last 7 days</span>
      </div>
      
      {/* Bar Chart */}
      <div className="mb-4 flex h-40 items-end justify-between gap-2">
        {last7Days.map((day, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="relative w-full flex-1">
              <div 
                className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-blue-500 to-indigo-500 transition-all duration-300"
                style={{ height: `${Math.max((day.amount / maxAmount) * 100, 5)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{day.day}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
        <div className="text-center">
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalWeekSales)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(todayStats.total)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
        </div>
      </div>
    </div>
  );
}

// Stock by Category Chart (replaces UsedDevices)
function StockByCategoryChart() {
  const { stockItems } = useStockStore();
  
  const categoryData = useMemo(() => {
    const categories: Record<string, { available: number; sold: number }> = {};
    
    stockItems.forEach(item => {
      // We'll use a simple mapping - in real scenario, get from product
      const cat = "Items"; // Simplified
      if (!categories[cat]) categories[cat] = { available: 0, sold: 0 };
      if (item.status === "Available") categories[cat].available++;
      else if (item.status === "Sold") categories[cat].sold++;
    });
    
    return {
      available: stockItems.filter(s => s.status === "Available").length,
      sold: stockItems.filter(s => s.status === "Sold").length,
      service: stockItems.filter(s => s.status === "Service").length,
      total: stockItems.length,
    };
  }, [stockItems]);

  const availablePercent = categoryData.total > 0 ? (categoryData.available / categoryData.total) * 100 : 0;
  const soldPercent = categoryData.total > 0 ? (categoryData.sold / categoryData.total) * 100 : 0;

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
      <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">Stock Status</h3>
      
      {/* Donut-like visualization */}
      <div className="mb-4 flex items-center justify-center">
        <div className="relative h-32 w-32">
          {/* Background Circle */}
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" className="dark:stroke-gray-700" />
            <circle 
              cx="18" cy="18" r="16" fill="none" 
              stroke="#22c55e" strokeWidth="3"
              strokeDasharray={`${availablePercent} ${100 - availablePercent}`}
              strokeLinecap="round"
            />
            <circle 
              cx="18" cy="18" r="16" fill="none" 
              stroke="#ef4444" strokeWidth="3"
              strokeDasharray={`${soldPercent} ${100 - soldPercent}`}
              strokeDashoffset={`${-availablePercent}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-dark dark:text-white">{categoryData.total}</span>
            <span className="text-xs text-gray-500">Total</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Available</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">{categoryData.available}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Sold</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">{categoryData.sold}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">In Service</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">{categoryData.service}</span>
        </div>
      </div>
    </div>
  );
}

// Quick Actions Component
function QuickActions() {
  const actions = [
    { 
      label: "New Sale", 
      href: "/sales/new", 
      color: "from-green-500 to-emerald-600", 
      icon: (
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
      )
    },
    { 
      label: "Add Stock", 
      href: "/inventory/stock/add", 
      color: "from-blue-500 to-indigo-600", 
      icon: (
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
      )
    },
    { 
      label: "New Service", 
      href: "/services/new", 
      color: "from-purple-500 to-pink-600", 
      icon: (
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
        </svg>
      )
    },
    { 
      label: "Add Expense", 
      href: "/expenses/new", 
      color: "from-orange-500 to-red-600", 
      icon: (
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
        </svg>
      )
    },
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
            {action.icon}
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
    { 
      type: "sale", 
      text: "New sale INV-2024-0030 - ৳145,000", 
      time: "2 min ago", 
      icon: (
        <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
        </svg>
      )
    },
    { 
      type: "stock", 
      text: "Added 3 new MacBook Pro units", 
      time: "15 min ago", 
      icon: (
        <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
      )
    },
    { 
      type: "service", 
      text: "Service SRV-2024-0018 completed", 
      time: "1 hour ago", 
      icon: (
        <svg className="h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )
    },
    { 
      type: "customer", 
      text: "New customer: Md. Rahim Uddin", 
      time: "2 hours ago", 
      icon: (
        <svg className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
      )
    },
    { 
      type: "expense", 
      text: "Expense: Shop rent - ৳30,000", 
      time: "5 hours ago", 
      icon: (
        <svg className="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )
    },
  ];

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
      <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              {activity.icon}
            </div>
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
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-dark dark:text-white">Low Stock Alert</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{lowStockItems.length} items need attention</p>
          </div>
        </div>
        <a 
          href="/inventory/stock" 
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          View All →
        </a>
      </div>
      
      <div className="space-y-3">
        {lowStockItems.map((item, i) => (
          <div 
            key={i} 
            className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800/30 dark:bg-orange-900/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                {item.available}
              </div>
              <span className="font-medium text-gray-900 dark:text-white">{item.product}</span>
            </div>
            <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-medium text-white">
              Low Stock
            </span>
          </div>
        ))}
      </div>
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

      {/* Charts Section */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SalesSummaryChart />
        <StockByCategoryChart />
      </div>

      {/* Low Stock Alert & Recent Activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LowStockAlert />
        <RecentActivity />
      </div>
    </>
  );
}
