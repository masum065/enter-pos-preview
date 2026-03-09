import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sales, expenses, serviceRecords, stockItems, customers } from "@/db/schema";
import { and, gte, lte, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

// GET /api/reports/dashboard - Dashboard overview stats
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const todayStart = new Date(currentYear, currentMonth, now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = new Date(currentYear, currentMonth, 1);
    const prevMonthStart = new Date(prevYear, prevMonth, 1);

    // ── Run queries sequentially to prevent connection pool exhaustion ──
    // Today's sales
    const todaySales = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<string>`COALESCE(SUM(${sales.grandTotal}::numeric), 0)`,
        profit: sql<string>`COALESCE(SUM(${sales.totalProfit}::numeric), 0)`,
      })
      .from(sales)
      .where(and(gte(sales.invoiceDate, todayStart), lte(sales.invoiceDate, todayEnd)));

    // This month's sales
    const monthSales = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<string>`COALESCE(SUM(${sales.grandTotal}::numeric), 0)`,
        profit: sql<string>`COALESCE(SUM(${sales.totalProfit}::numeric), 0)`,
      })
      .from(sales)
      .where(and(gte(sales.invoiceDate, monthStart), lte(sales.invoiceDate, todayEnd)));

    // Total due
    const totalDue = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${sales.dueAmount}::numeric), 0)`,
        count: sql<number>`SUM(CASE WHEN ${sales.dueAmount}::numeric > 0 THEN 1 ELSE 0 END)`,
      })
      .from(sales)
      .where(sql`${sales.dueAmount}::numeric > 0`);

    // Today's expenses
    const todayExpenses = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)` })
      .from(expenses)
      .where(and(gte(expenses.date, todayStart), lte(expenses.date, todayEnd)));

    // This month's expenses
    const monthExpenses = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)` })
      .from(expenses)
      .where(and(gte(expenses.date, monthStart), lte(expenses.date, todayEnd)));

    // Stock overview — single query with conditional aggregates
    const stockStats = await db
      .select({
        total: sql<number>`count(*)`,
        available: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'Available')`,
        sold: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'Sold')`,
        service: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'Service')`,
        returned: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'Returned')`,
        damaged: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'Damaged')`,
        stockValue: sql<string>`COALESCE(SUM(${stockItems.purchasePrice}::numeric) FILTER (WHERE ${stockItems.status} = 'Available'), 0)`,
      })
      .from(stockItems);

    // Pending services
    const pendingServices = await db
      .select({
        count: sql<number>`count(*)`,
        dueAmount: sql<string>`COALESCE(SUM(${serviceRecords.dueAmount}::numeric), 0)`,
      })
      .from(serviceRecords)
      .where(sql`${serviceRecords.status} NOT IN ('Delivered', 'Cancelled')`);

    // Total customers
    const totalCustomers = await db.select({ count: sql<number>`count(*)` }).from(customers);

    // Chart sales (last 2 months)
    const chartSalesCursor = await db
      .select({
        createdAt: sales.createdAt,
        total: sales.grandTotal,
        profit: sales.totalProfit,
      })
      .from(sales)
      .where(gte(sales.createdAt, prevMonthStart));
      
    // Calculate daily data
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    const maxDays = Math.max(daysInCurrentMonth, daysInPrevMonth);

    const currentDaily: number[] = new Array(maxDays).fill(0);
    const prevDaily: number[] = new Array(maxDays).fill(0);
    let curTotal = 0, prvTotal = 0, curProfit = 0, prvProfit = 0;

    chartSalesCursor.forEach(s => {
      const d = new Date(s.createdAt);
      const amount = parseFloat(String(s.total || 0));
      const profit = parseFloat(String(s.profit || 0));
      
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate() - 1;
        if (day < maxDays) currentDaily[day] += amount;
        curTotal += amount;
        curProfit += profit;
      } else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
        const day = d.getDate() - 1;
        if (day < maxDays) prevDaily[day] += amount;
        prvTotal += amount;
        prvProfit += profit;
      }
    });

    // Generate labels (1, 2, 3, ... 31)
    const labels = Array.from({ length: maxDays }, (_, i) => (i + 1).toString());

    const chartData = {
      currentMonthData: currentDaily.map((y, i) => ({ x: labels[i], y: Math.round(y) })),
      prevMonthData: prevDaily.map((y, i) => ({ x: labels[i], y: Math.round(y) })),
      currentMonthTotal: curTotal,
      prevMonthTotal: prvTotal,
      currentMonthProfit: curProfit,
      prevMonthProfit: prvProfit,
    };

    const response = NextResponse.json({
      today: {
        sales: Number(todaySales[0].count),
        revenue: todaySales[0].total,
        profit: todaySales[0].profit,
        expenses: todayExpenses[0].total,
      },
      thisMonth: {
        sales: Number(monthSales[0].count),
        revenue: monthSales[0].total,
        profit: monthSales[0].profit,
        expenses: monthExpenses[0].total,
      },
      totalDue: totalDue[0].total,
      dueCount: Number(totalDue[0].count),
      stock: stockStats[0],
      services: {
        pending: Number(pendingServices[0].count),
        dueAmount: pendingServices[0].dueAmount,
      },
      totalCustomers: Number(totalCustomers[0].count),
      chartData,
    });

    // Cache for 30 seconds (dashboard stats don't need real-time precision)
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
