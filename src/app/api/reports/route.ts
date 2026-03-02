import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  sales, serviceRecords, expenses, activityLogs,
  stockItems, products,
} from "@/db/schema";
import { desc, gte, lte, and, sql, ilike, or } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "summary"; // summary | activity
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search") || "";
    const actionFilter = searchParams.get("action") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // ── Build date conditions ──────────────────────────────────────────────
    const buildDateWhere = (dateCol: any) => {
      const conds = [];
      if (startDate) conds.push(gte(dateCol, new Date(startDate)));
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        conds.push(lte(dateCol, end));
      }
      return conds.length > 0 ? and(...conds) : undefined;
    };

    // ── Activity Log ───────────────────────────────────────────────────────
    if (type === "activity") {
      const conds: any[] = [];
      if (startDate || endDate) {
        const w = buildDateWhere(activityLogs.createdAt);
        if (w) conds.push(w);
      }
      if (actionFilter && actionFilter !== "all") conds.push(sql`${activityLogs.action} ILIKE ${`%${actionFilter}%`}`);
      if (search) {
        conds.push(or(
          ilike(activityLogs.userName, `%${search}%`),
          ilike(activityLogs.details, `%${search}%`),
          ilike(activityLogs.action, `%${search}%`),
        ));
      }
      const where = conds.length > 0 ? and(...conds) : undefined;
      const offset = (page - 1) * limit;

      const [logs, [{ count }]] = await Promise.all([
        db.select().from(activityLogs).where(where).orderBy(desc(activityLogs.createdAt)).limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(activityLogs).where(where),
      ]);

      return NextResponse.json({ logs, pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) } });
    }

    // ── Summary aggregations ───────────────────────────────────────────────
    const salesWhere = buildDateWhere(sales.invoiceDate);
    const serviceWhere = buildDateWhere(serviceRecords.receivedDate);
    const expenseWhere = buildDateWhere(expenses.date);

    // Sales stats
    const [salesStats] = await db.select({
      count:       sql<number>`COUNT(*)`,
      revenue:     sql<string>`COALESCE(SUM(${sales.grandTotal}), 0)`,
      collected:   sql<string>`COALESCE(SUM(${sales.paidAmount}), 0)`,
      due:         sql<string>`COALESCE(SUM(${sales.dueAmount}), 0)`,
      grossProfit: sql<string>`COALESCE(SUM(${sales.totalProfit}), 0)`,
      returned:    sql<string>`COALESCE(SUM(${sales.totalReturned}), 0)`,
    }).from(sales).where(salesWhere);

    // Service stats
    const [serviceStats] = await db.select({
      count:     sql<number>`COUNT(*)`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${serviceRecords.status} IN ('Completed','Delivered'))`,
      pending:   sql<number>`COUNT(*) FILTER (WHERE ${serviceRecords.status} NOT IN ('Completed','Delivered','Cancelled'))`,
      revenue:   sql<string>`COALESCE(SUM(${serviceRecords.totalCost}), 0)`,
      collected: sql<string>`COALESCE(SUM(${serviceRecords.paidAmount}), 0)`,
      due:       sql<string>`COALESCE(SUM(${serviceRecords.dueAmount}), 0)`,
      // Service profit = serviceCharge - partsCost (parts are cost/purchase expense)
      grossProfit: sql<string>`COALESCE(SUM(${serviceRecords.serviceCharge} - ${serviceRecords.partsCost}), 0)`,
    }).from(serviceRecords).where(serviceWhere);

    // Expense stats + by-category
    const [expenseStats] = await db.select({
      count:  sql<number>`COUNT(*)`,
      total:  sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
    }).from(expenses).where(expenseWhere);

    const expenseByCategory = await db.select({
      category: expenses.category,
      total:    sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      count:    sql<number>`COUNT(*)`,
    }).from(expenses).where(expenseWhere).groupBy(expenses.category).orderBy(sql`SUM(${expenses.amount}) DESC`);

    // Inventory stats (not date-filtered — live snapshot)
    const [inventoryStats] = await db.select({
      total:     sql<number>`COUNT(*)`,
      available: sql<number>`COUNT(*) FILTER (WHERE ${stockItems.status} = 'Available')`,
      sold:      sql<number>`COUNT(*) FILTER (WHERE ${stockItems.status} = 'Sold')`,
      inService: sql<number>`COUNT(*) FILTER (WHERE ${stockItems.status} = 'Service')`,
      stockValue: sql<string>`COALESCE(SUM(${stockItems.purchasePrice}) FILTER (WHERE ${stockItems.status} = 'Available'), 0)`,
    }).from(stockItems);

    // Derived profit figures
    const salesRevenue     = Number(salesStats.revenue);
    const serviceRevenue   = Number(serviceStats.revenue);
    const totalRevenue     = salesRevenue + serviceRevenue;
    const salesGross       = Number(salesStats.grossProfit);
    const serviceGross     = Number(serviceStats.grossProfit);
    const totalGrossProfit = salesGross + serviceGross;
    const totalExpenses    = Number(expenseStats.total);
    const netProfit        = totalGrossProfit - totalExpenses;
    const profitMargin     = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const grossMargin      = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      sales: {
        count:       Number(salesStats.count),
        revenue:     salesRevenue,
        collected:   Number(salesStats.collected),
        due:         Number(salesStats.due),
        grossProfit: salesGross,
        returned:    Number(salesStats.returned),
        avgOrder:    Number(salesStats.count) > 0 ? salesRevenue / Number(salesStats.count) : 0,
      },
      services: {
        count:       Number(serviceStats.count),
        completed:   Number(serviceStats.completed),
        pending:     Number(serviceStats.pending),
        revenue:     serviceRevenue,
        collected:   Number(serviceStats.collected),
        due:         Number(serviceStats.due),
        grossProfit: serviceGross,
      },
      expenses: {
        count:      Number(expenseStats.count),
        total:      totalExpenses,
        byCategory: expenseByCategory.map(r => ({ category: r.category, total: Number(r.total), count: r.count })),
      },
      profit: {
        salesRevenue,
        serviceRevenue,
        totalRevenue,
        salesGrossProfit:    salesGross,
        serviceGrossProfit:  serviceGross,
        totalGrossProfit,
        totalExpenses,
        netProfit,
        profitMargin:  Math.round(profitMargin * 100) / 100,
        grossMargin:   Math.round(grossMargin * 100) / 100,
        isProfit: netProfit >= 0,
      },
      inventory: {
        total:      Number(inventoryStats.total),
        available:  Number(inventoryStats.available),
        sold:       Number(inventoryStats.sold),
        inService:  Number(inventoryStats.inService),
        stockValue: Number(inventoryStats.stockValue),
      },
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
