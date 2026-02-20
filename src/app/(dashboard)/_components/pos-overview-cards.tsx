"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useSalesStore } from "@/stores/salesStore";
import { useServiceStore } from "@/stores/serviceStore";
import { useStockStore } from "@/stores/stockStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { useCustomerStore } from "@/stores/customerStore";
import { generateAllMockData } from "@/lib/mockData";
import { useProductStore } from "@/stores/productStore";

// Icon Components
function SalesIcon() {
  return (
    <svg width={58} height={58} viewBox="0 0 58 58" fill="none">
      <circle cx={29} cy={29} r={29} fill="#3FD97F" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 20.25A2.75 2.75 0 0021.25 23v12A2.75 2.75 0 0024 37.75h10A2.75 2.75 0 0036.75 35V23A2.75 2.75 0 0034 20.25H24zM22.75 23c0-.69.56-1.25 1.25-1.25h10c.69 0 1.25.56 1.25 1.25v12c0 .69-.56 1.25-1.25 1.25H24c-.69 0-1.25-.56-1.25-1.25V23z"
        fill="#fff"
      />
      <path d="M25.75 25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zM25 29.25a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75zM25.75 32a.75.75 0 000 1.5h4a.75.75 0 000-1.5h-4z" fill="#fff" />
    </svg>
  );
}

function ProfitIcon() {
  return (
    <svg width={58} height={58} viewBox="0 0 58 58" fill="none">
      <circle cx={29} cy={29} r={29} fill="#FF9C55" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M29 39.833c5.983 0 10.833-4.85 10.833-10.833 0-5.983-4.85-10.834-10.833-10.834-5.983 0-10.834 4.85-10.834 10.834 0 5.983 4.85 10.833 10.834 10.833zm.812-17.333a.812.812 0 10-1.625 0v.343c-1.766.316-3.25 1.643-3.25 3.448 0 2.077 1.964 3.521 4.063 3.521 1.491 0 2.437.982 2.437 1.896 0 .915-.946 1.896-2.437 1.896-1.491 0-2.438-.981-2.438-1.896a.812.812 0 10-1.625 0c0 1.805 1.484 3.132 3.25 3.449v.343a.812.812 0 101.625 0v-.343c1.767-.317 3.25-1.644 3.25-3.449 0-2.077-1.963-3.52-4.062-3.52-1.491 0-2.438-.982-2.438-1.896 0-.915.947-1.896 2.438-1.896s2.437.98 2.437 1.895a.813.813 0 001.625 0c0-1.805-1.483-3.132-3.25-3.448V22.5z"
        fill="#fff"
      />
    </svg>
  );
}

function DueIcon() {
  return (
    <svg width={58} height={58} viewBox="0 0 58 58" fill="none">
      <circle cx={29} cy={29} r={29} fill="#F87171" />
      <path
        d="M29 18.167c-5.983 0-10.833 4.85-10.833 10.833S23.017 39.833 29 39.833 39.833 34.983 39.833 29 34.983 18.167 29 18.167zm0 15.708a.812.812 0 110-1.625.812.812 0 010 1.625zm.813-4.875a.812.812 0 11-1.626 0V24.125a.812.812 0 111.626 0V29z"
        fill="#fff"
      />
    </svg>
  );
}

function ServiceIcon() {
  return (
    <svg width={58} height={58} viewBox="0 0 58 58" fill="none">
      <circle cx={29} cy={29} r={29} fill="#8155FF" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M29 19.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75-4.365-9.75-9.75-9.75zm.75 4.5a.75.75 0 00-1.5 0v5.25c0 .199.079.39.22.53l3 3a.75.75 0 101.06-1.06l-2.78-2.78V23.75z"
        fill="#fff"
      />
    </svg>
  );
}

function StockIcon() {
  return (
    <svg width={58} height={58} viewBox="0 0 58 58" fill="none">
      <circle cx={29} cy={29} r={29} fill="#18BFFF" />
      <path
        d="M35.043 20.8l-2.167-1.136c-1.902-.998-2.853-1.498-3.876-1.498-1.023 0-1.974.5-3.876 1.498L22.958 20.8c-1.922 1.008-3.051 1.6-3.752 2.394L29 28.09l9.794-4.896c-.7-.793-1.83-1.386-3.751-2.394zM39.56 24.628l-9.747 4.874v10.227c.777-.194 1.662-.658 3.063-1.393l2.167-1.137c2.33-1.223 3.496-1.835 4.143-2.934.647-1.099.647-2.467.647-5.202v-.127c0-2.05 0-3.332-.272-4.308zM28.188 39.73V29.501l-9.749-4.874c-.272.976-.272 2.258-.272 4.308v.127c0 2.735 0 4.103.647 5.202.647 1.1 1.813 1.71 4.144 2.934l2.166 1.137c1.4.735 2.286 1.2 3.064 1.393z"
        fill="#fff"
      />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg width={58} height={58} viewBox="0 0 58 58" fill="none">
      <circle cx={29} cy={29} r={29} fill="#F59E0B" />
      <path
        d="M20.5 34.25h17M20.5 29h17M24.75 23.75h8.5"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

// Overview Card Component
function OverviewCard({
  label,
  value,
  subValue,
  Icon,
  trend,
  trendLabel,
}: {
  label: string;
  value: string;
  subValue?: string;
  Icon: React.ComponentType;
  trend?: number;
  trendLabel?: string;
}) {
  const isPositive = trend ? trend >= 0 : true;

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark">
      <Icon />

      <div className="mt-6 flex items-end justify-between">
        <dl>
          <dt className="mb-1.5 text-heading-6 font-bold text-dark dark:text-white">
            {value}
          </dt>
          <dd className="text-sm font-medium text-dark-6">{label}</dd>
          {subValue && (
            <dd className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subValue}</dd>
          )}
        </dl>

        {trend !== undefined && (
          <dl className={cn("text-sm font-medium", isPositive ? "text-green" : "text-red")}>
            <dt className="flex items-center gap-1.5">
              {isPositive ? "+" : ""}{trend}%
              {isPositive ? (
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M6 3.5l4 5H2l4-5z" />
                </svg>
              ) : (
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M6 8.5l-4-5h8l-4 5z" />
                </svg>
              )}
            </dt>
            <dd className="sr-only">{trendLabel || "Change"}</dd>
          </dl>
        )}
      </div>
    </div>
  );
}

export function POSOverviewCards() {
  const salesStore = useSalesStore();
  const serviceStore = useServiceStore();
  const stockStore = useStockStore();
  const expenseStore = useExpenseStore();
  const customerStore = useCustomerStore();
  const productStore = useProductStore();

  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize mock data if stores are empty
  useEffect(() => {
    const initData = async () => {
      // Generate mock data if empty
      if (customerStore.customers.length === 0) {
        const mockData = generateAllMockData();
        
        // Add customers
        mockData.customers.forEach((c) => customerStore.addCustomer({
          name: c.name, phone: c.phone, email: c.email, address: c.address, nid: c.nid, notes: c.notes,
        }));

        // Add products
        mockData.products.forEach((p) => productStore.addProduct({
          modelName: p.modelName, brand: p.brand, category: p.category, description: p.description,
          specifications: p.specifications, defaultSalePrice: p.defaultSalePrice, warranty: p.warranty,
        }));
      }
      
      setIsLoaded(true);
    };

    initData();
  }, []);

  const todaysSales = salesStore.getTodaysSales();
  const thisMonthSales = salesStore.getThisMonthSales();
  const todaysProfit = salesStore.getTodaysProfit();
  const thisMonthProfit = salesStore.getThisMonthProfit();
  const totalDue = salesStore.getTotalDue();
  const pendingServices = serviceStore.getPendingServicesCount();
  const availableStock = stockStore.getAvailableStockCount();
  const stockValue = stockStore.getTotalStockValue();
  const thisMonthExpenses = expenseStore.getThisMonthExpenses();

  if (!isLoaded) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-[10px] bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      <OverviewCard
        label="Today's Sales"
        value={formatCurrency(todaysSales.total)}
        subValue={`${todaysSales.count} invoices`}
        Icon={SalesIcon}
        trend={12}
        trendLabel="vs yesterday"
      />

      <OverviewCard
        label="This Month Profit"
        value={formatCurrency(thisMonthProfit)}
        subValue={`${thisMonthSales.count} total sales`}
        Icon={ProfitIcon}
        trend={8}
        trendLabel="vs last month"
      />

      <OverviewCard
        label="Total Due"
        value={formatCurrency(totalDue)}
        subValue={`${salesStore.getSalesWithDue().length} pending`}
        Icon={DueIcon}
        trend={totalDue > 0 ? -5 : 0}
      />

      <OverviewCard
        label="Pending Services"
        value={pendingServices.toString()}
        subValue={`${serviceStore.getServicesWithDue().length} unpaid`}
        Icon={ServiceIcon}
      />

      <OverviewCard
        label="Available Stock"
        value={availableStock.toString()}
        subValue={`Value: ${formatCurrency(stockValue)}`}
        Icon={StockIcon}
      />

      <OverviewCard
        label="This Month Expenses"
        value={formatCurrency(thisMonthExpenses)}
        subValue="All categories"
        Icon={ExpenseIcon}
        trend={-3}
      />
    </div>
  );
}
