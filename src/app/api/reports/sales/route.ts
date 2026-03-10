import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sales, expenses } from "@/db/schema";
import { and, gte, lte, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

// GET /api/reports/sales - Sales & profit report
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only admin and manager can view reports
    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "day"; // day, week, month

    // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Sales summary for period
    const salesSummary = await db
      .select({
        totalSales: sql<number>`count(*)`,
        totalRevenue: sql<string>`COALESCE(SUM(${sales.grandTotal}::numeric), 0)`,
        totalProfit: sql<string>`COALESCE(SUM(${sales.totalProfit}::numeric), 0)`,
        totalDue: sql<string>`COALESCE(SUM(${sales.dueAmount}::numeric), 0)`,
        totalPaid: sql<string>`COALESCE(SUM(${sales.paidAmount}::numeric), 0)`,
        totalDiscount: sql<string>`COALESCE(SUM(${sales.discountAmount}::numeric), 0)`,
        totalTax: sql<string>`COALESCE(SUM(${sales.taxAmount}::numeric), 0)`,
        totalReturned: sql<string>`COALESCE(SUM(${sales.totalReturned}::numeric), 0)`,
        avgOrderValue: sql<string>`COALESCE(AVG(${sales.grandTotal}::numeric), 0)`,
      })
      .from(sales)
      .where(and(gte(sales.invoiceDate, start), lte(sales.invoiceDate, end)));

    // Expenses for same period
    const expensesSummary = await db
      .select({
        totalExpenses: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
      })
      .from(expenses)
      .where(and(gte(expenses.date, start), lte(expenses.date, end)));

    // Daily/weekly/monthly breakdown
    let dateFormat: string;
    if (groupBy === "month") {
      dateFormat = "YYYY-MM";
    } else if (groupBy === "week") {
      dateFormat = "IYYY-IW";
    } else {
      dateFormat = "YYYY-MM-DD";
    }

    const salesByPeriod = await db
      .select({
        period: sql<string>`to_char(${sales.invoiceDate}, ${dateFormat})`,
        sales: sql<number>`count(*)`,
        revenue: sql<string>`COALESCE(SUM(${sales.grandTotal}::numeric), 0)`,
        profit: sql<string>`COALESCE(SUM(${sales.totalProfit}::numeric), 0)`,
      })
      .from(sales)
      .where(and(gte(sales.invoiceDate, start), lte(sales.invoiceDate, end)))
      .groupBy(sql`to_char(${sales.invoiceDate}, ${dateFormat})`)
      .orderBy(sql`to_char(${sales.invoiceDate}, ${dateFormat})`);

    // Payment method breakdown - use Drizzle query builder
    const paymentBreakdown = await db.execute(sql`
      SELECT p.method, 
             COUNT(*)::int as count,
             COALESCE(SUM(p.amount::numeric), 0)::text as total
      FROM payments p
      JOIN sales s ON p.sale_id = s.id
      WHERE s.invoice_date >= ${start} AND s.invoice_date <= ${end}
      GROUP BY p.method
      ORDER BY total DESC
    `);

    // Net profit = gross profit - expenses
    const grossProfit = parseFloat(salesSummary[0].totalProfit);
    const totalExpenses = parseFloat(expensesSummary[0].totalExpenses);
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = parseFloat(salesSummary[0].totalRevenue) > 0
      ? (netProfit / parseFloat(salesSummary[0].totalRevenue) * 100).toFixed(2)
      : "0";

    return NextResponse.json({
      period: { start: start.toISOString(), end: end.toISOString() },
      sales: salesSummary[0],
      expenses: expensesSummary[0],
      profitAnalysis: {
        grossProfit: grossProfit.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        netProfit: netProfit.toFixed(2),
        profitMargin,
      },
      salesByPeriod,
      paymentBreakdown: paymentBreakdown as unknown as Array<{ method: string; count: number; total: string }>,
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}
