import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sales, saleItems, expenses, serviceRecords, stockItems, customers } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

// GET /api/reports/dashboard - Dashboard overview stats
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's sales
    const todaySales = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<string>`COALESCE(SUM(${sales.grandTotal}::numeric), 0)`,
        profit: sql<string>`COALESCE(SUM(${sales.totalProfit}::numeric), 0)`,
      })
      .from(sales)
      .where(and(
        gte(sales.invoiceDate, todayStart),
        lte(sales.invoiceDate, todayEnd)
      ));

    // This month's sales
    const monthSales = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<string>`COALESCE(SUM(${sales.grandTotal}::numeric), 0)`,
        profit: sql<string>`COALESCE(SUM(${sales.totalProfit}::numeric), 0)`,
      })
      .from(sales)
      .where(and(
        gte(sales.invoiceDate, monthStart),
        lte(sales.invoiceDate, todayEnd)
      ));

    // Total due amount
    const totalDue = await db
      .select({
        total: sql<string>`COALESCE(SUM(${sales.dueAmount}::numeric), 0)`,
      })
      .from(sales)
      .where(sql`${sales.dueAmount}::numeric > 0`);

    // Today's expenses
    const todayExpenses = await db
      .select({
        total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
      })
      .from(expenses)
      .where(and(
        gte(expenses.date, todayStart),
        lte(expenses.date, todayEnd)
      ));

    // This month's expenses
    const monthExpenses = await db
      .select({
        total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
      })
      .from(expenses)
      .where(and(
        gte(expenses.date, monthStart),
        lte(expenses.date, todayEnd)
      ));

    // Stock overview
    const stockStats = await db
      .select({
        total: sql<number>`count(*)`,
        available: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'available')`,
        sold: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'sold')`,
        service: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'service')`,
        returned: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'returned')`,
        damaged: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'damaged')`,
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
    const totalCustomers = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers);

    return NextResponse.json({
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
      stock: stockStats[0],
      services: {
        pending: Number(pendingServices[0].count),
        dueAmount: pendingServices[0].dueAmount,
      },
      totalCustomers: Number(totalCustomers[0].count),
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
