"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────
interface ReportData {
  sales: {
    count: number; revenue: number; collected: number; due: number;
    grossProfit: number; returned: number; avgOrder: number;
  };
  services: {
    count: number; completed: number; pending: number;
    revenue: number; collected: number; due: number; grossProfit: number;
  };
  expenses: {
    count: number; total: number;
    byCategory: { category: string; total: number; count: number }[];
  };
  profit: {
    salesRevenue: number; serviceRevenue: number; totalRevenue: number;
    salesGrossProfit: number; serviceGrossProfit: number; totalGrossProfit: number;
    totalExpenses: number; netProfit: number;
    profitMargin: number; grossMargin: number; isProfit: boolean;
  };
  inventory: {
    total: number; available: number; sold: number; inService: number; stockValue: number;
  };
}

type ReportTab = "profit" | "sales" | "purchase" | "service" | "expense" | "inventory" | "activity";
type DatePreset = "today" | "week" | "month" | "year" | "custom";

// ── Date helpers ──────────────────────────────────────────────────────────
function getPresetDates(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const today = fmt(now);

  if (preset === "today") {
    return { start: today, end: today };
  }
  if (preset === "week") {
    const d = new Date(now); d.setDate(d.getDate() - 6);
    return { start: fmt(d), end: today };
  }
  if (preset === "month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: fmt(d), end: today };
  }
  if (preset === "year") {
    const d = new Date(now.getFullYear(), 0, 1);
    return { start: fmt(d), end: today };
  }
  return { start: "", end: "" }; // custom — caller provides
}

// ── Mini stat card ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "gray", large = false }: {
  label: string; value: string; sub?: string;
  color?: "gray" | "blue" | "green" | "red" | "orange" | "purple";
  large?: boolean;
}) {
  const colorMap: Record<string, string> = {
    gray:   "text-gray-900 dark:text-white",
    blue:   "text-blue-600 dark:text-blue-400",
    green:  "text-green-600 dark:text-green-400",
    red:    "text-red-600 dark:text-red-400",
    orange: "text-orange-600 dark:text-orange-400",
    purple: "text-purple-600 dark:text-purple-400",
  };
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 font-bold ${large ? "text-3xl" : "text-2xl"} ${colorMap[color]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Export helpers (dynamic import to avoid SSR issues) ───────────────────
async function exportXLSX(data: any[], sheetName: string, fileName: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

async function exportPDF(
  title: string,
  dateLabel: string,
  columns: string[],
  rows: (string | number)[][],
  fileName: string,
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Period: ${dateLabel}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString("en-BD")}`, 14, 36);

  autoTable(doc, {
    startY: 44,
    head: [columns],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`${fileName}.pdf`);
}

// ── Styled Sales Report HTML (invoice style) ──────────────────────────────
function buildSalesReportHTML(rows: any[], dateLabel: string, summary: any): string {
  const fmt = (n: number) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const today = new Date().toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" });
  const totalAmt  = rows.reduce((s: number, r: any) => s + Number(r.grandTotal), 0);
  const totalPaid = rows.reduce((s: number, r: any) => s + Number(r.paidAmount), 0);
  const totalDue  = rows.reduce((s: number, r: any) => s + Number(r.dueAmount), 0);

  const tableRows = rows.map((s: any, i: number) => {
    const due = Number(s.dueAmount), paid = Number(s.paidAmount), total = Number(s.grandTotal);
    const status = s.paymentStatus || (due <= 0 ? "Paid" : paid > 0 ? "Partial" : "Pending");
    const date = new Date(s.invoiceDate || s.createdAt).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" });
    const bg = i % 2 === 1 ? "background:#fafafa;" : "";
    return `<tr style="${bg}">
      <td style="font-family:monospace;font-size:9px;">${s.invoiceNumber}</td>
      <td>${date}</td><td>${s.customerName}</td><td>${s.customerPhone || ""}</td>
      <td style="text-align:right;">${fmt(total)}</td>
      <td style="text-align:right;">${fmt(paid)}</td>
      <td style="text-align:right;">${due > 0 ? fmt(due) : "—"}</td>
      <td style="text-align:center;">${status}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Sales Report — ${dateLabel}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1a1a1a;background:#fff;padding:24px 28px;}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
.logo{font-size:26px;font-weight:900;font-style:italic;letter-spacing:-0.5px;}
.shop-name{font-weight:700;font-size:11px;margin-top:4px;}
.shop-addr{font-size:10px;color:#555;line-height:1.4;margin-top:2px;}
.rep-box{border:1px solid #9ca3af;font-size:11px;min-width:190px;}
.rep-box-title{text-align:center;font-weight:700;border-bottom:1px solid #9ca3af;padding:4px 16px;background:#f3f4f6;}
.rep-box-row{padding:4px 16px;border-bottom:1px solid #e5e7eb;}
.rep-box-row:last-child{border-bottom:none;}
.summary{display:flex;flex-wrap:wrap;gap:8px;padding:8px 0 10px;}
.sc{border:1px solid #e5e7eb;border-radius:4px;padding:5px 12px;min-width:100px;}
.sc .lbl{font-size:9px;color:#555;}
.sc .val{font-size:12px;font-weight:700;margin-top:1px;}
table{width:100%;border-collapse:collapse;border:1px solid #9ca3af;}
th,td{border:1px solid #9ca3af;padding:4px 7px;font-size:10px;word-break:break-word;}
thead th{background:#f3f4f6;font-weight:700;}
tfoot td{background:#f3f4f6;font-weight:700;}
.note{font-size:9px;color:#555;margin-top:8px;}
.footer-note{text-align:center;font-size:9px;color:#9ca3af;margin-top:16px;padding-top:10px;border-top:1px solid #f3f4f6;}
@media print{@page{size:A4;margin:10mm 12mm;}body{padding:0!important;}}
</style></head><body>
<div class="hdr">
  <div>
    <div class="logo">ENTER</div>
    <div class="shop-name">Enter Computers</div>
    <div class="shop-addr">Dhaka, Bangladesh | Phone: +880 1234-567890 | info@entercomputers.com</div>
  </div>
  <div class="rep-box">
    <div class="rep-box-title">Sales Audit Report</div>
    <div class="rep-box-row">Period: <strong>${dateLabel}</strong></div>
    <div class="rep-box-row">Printed: ${today}</div>
    <div class="rep-box-row">Records: <strong>${rows.length}</strong></div>
  </div>
</div>
<div class="summary">
  <div class="sc"><div class="lbl">Total Sales</div><div class="val">${summary.count}</div></div>
  <div class="sc"><div class="lbl">Revenue</div><div class="val">৳${fmt(summary.revenue)}</div></div>
  <div class="sc"><div class="lbl">Collected</div><div class="val">৳${fmt(summary.collected)}</div></div>
  <div class="sc"><div class="lbl">Due</div><div class="val">৳${fmt(summary.due)}</div></div>
  <div class="sc"><div class="lbl">Gross Profit</div><div class="val">৳${fmt(summary.grossProfit)}</div></div>
  <div class="sc"><div class="lbl">Avg Order</div><div class="val">৳${fmt(summary.avgOrder)}</div></div>
</div>
<table>
  <thead><tr>
    <th style="width:100px">Invoice #</th><th style="width:72px">Date</th>
    <th>Customer</th><th style="width:88px">Phone</th>
    <th style="text-align:right;width:82px">Total (৳)</th>
    <th style="text-align:right;width:82px">Paid (৳)</th>
    <th style="text-align:right;width:72px">Due (৳)</th>
    <th style="text-align:center;width:55px">Status</th>
  </tr></thead>
  <tbody>${tableRows || "<tr><td colspan='8' style='text-align:center;padding:10px;color:#999;'>No records</td></tr>"}</tbody>
  <tfoot><tr>
    <td colspan="4">Total (${rows.length} records)</td>
    <td style="text-align:right;">${fmt(totalAmt)}</td>
    <td style="text-align:right;">${fmt(totalPaid)}</td>
    <td style="text-align:right;">${fmt(totalDue)}</td>
    <td></td>
  </tr></tfoot>
</table>
<p class="note">* Showing current page records. Export XLSX for complete dataset.</p>
<div class="footer-note">System Generated Report — Enter Computers © ${new Date().getFullYear()}</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body></html>`;
}

// ── HTML template helper (shared structure) ───────────────────────────────
function reportShell(title: string, dateLabel: string, today: string, records: number, summaryCards: string, tableHTML: string, noteHTML = ""): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1a1a1a;background:#fff;padding:24px 28px;}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
.logo{font-size:26px;font-weight:900;font-style:italic;letter-spacing:-0.5px;}
.shop-name{font-weight:700;font-size:11px;margin-top:4px;}
.shop-addr{font-size:10px;color:#555;line-height:1.4;margin-top:2px;}
.rep-box{border:1px solid #9ca3af;font-size:11px;min-width:190px;}
.rep-box-title{text-align:center;font-weight:700;border-bottom:1px solid #9ca3af;padding:4px 16px;background:#f3f4f6;}
.rep-box-row{padding:4px 16px;border-bottom:1px solid #e5e7eb;}
.rep-box-row:last-child{border-bottom:none;}
.summary{display:flex;flex-wrap:wrap;gap:8px;padding:8px 0 10px;}
.sc{border:1px solid #e5e7eb;border-radius:4px;padding:5px 12px;min-width:100px;}
.sc .lbl{font-size:9px;color:#555;}.sc .val{font-size:12px;font-weight:700;margin-top:1px;}
table{width:100%;border-collapse:collapse;border:1px solid #9ca3af;}
th,td{border:1px solid #9ca3af;padding:4px 7px;font-size:10px;word-break:break-word;}
thead th{background:#f3f4f6;font-weight:700;}
tfoot td{background:#f3f4f6;font-weight:700;}
.note{font-size:9px;color:#555;margin-top:8px;}
.footer-note{text-align:center;font-size:9px;color:#9ca3af;margin-top:16px;padding-top:10px;border-top:1px solid #f3f4f6;}
@media print{@page{size:A4;margin:10mm 12mm;}body{padding:0!important;}}
</style></head><body>
<div class="hdr">
  <div>
    <div class="logo">ENTER</div>
    <div class="shop-name">Enter Computers</div>
    <div class="shop-addr">Dhaka, Bangladesh | Phone: +880 1234-567890 | info@entercomputers.com</div>
  </div>
  <div class="rep-box">
    <div class="rep-box-title">${title}</div>
    <div class="rep-box-row">Period: <strong>${dateLabel}</strong></div>
    <div class="rep-box-row">Printed: ${today}</div>
    <div class="rep-box-row">Records: <strong>${records}</strong></div>
  </div>
</div>
<div class="summary">${summaryCards}</div>
${tableHTML}
${noteHTML}
<p class="note">* Showing current page records. Export XLSX for complete dataset.</p>
<div class="footer-note">System Generated Report — Enter Computers © ${new Date().getFullYear()}</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body></html>`;
}

function sc(lbl: string, val: string) { return `<div class="sc"><div class="lbl">${lbl}</div><div class="val">${val}</div></div>`; }
const fmtN = (n: number | string) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtToday = () => new Date().toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" });
const fmtDate2 = (d: string) => { try { return new Date(d).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; } };

// Purchase Report HTML
function buildPurchaseReportHTML(rows: any[], dateLabel: string, report: any): string {
  const totalPurchase = rows.reduce((s: number, r: any) => s + Number(r.purchasePrice), 0);
  const totalPaid     = rows.reduce((s: number, r: any) => s + Number(r.paidAmount), 0);
  const totalDue      = rows.reduce((s: number, r: any) => s + Number(r.dueAmount ?? 0), 0);

  const tbody = rows.map((r: any, i: number) => {
    const bg = i % 2 === 1 ? "background:#fafafa;" : "";
    return `<tr style="${bg}">
      <td style="font-family:monospace;font-size:9px;">${r.invoiceNumber}</td>
      <td>${fmtDate2(r.purchaseDate || r.createdAt)}</td>
      <td>${r.sellerName}</td><td>${r.sellerPhone || ""}</td>
      <td>${r.productName || ""}</td>
      <td style="font-family:monospace;font-size:9px;">${r.serialNumber || ""}</td>
      <td style="text-align:right;">${fmtN(r.purchasePrice)}</td>
      <td style="text-align:right;">${fmtN(r.paidAmount)}</td>
      <td style="text-align:right;">${Number(r.dueAmount ?? 0) > 0 ? fmtN(r.dueAmount) : "—"}</td>
      <td style="text-align:center;">${r.paymentStatus || ""}</td>
    </tr>`;
  }).join("");

  const cards = sc("Total", String(rows.length))
    + (report ? sc("Purchase Value", "৳" + fmtN(report.purchases?.totalValue ?? totalPurchase)) : "")
    + sc("Paid", "৳" + fmtN(totalPaid))
    + sc("Due", "৳" + fmtN(totalDue));

  const table = `<table>
  <thead><tr>
    <th style="width:96px">Invoice #</th><th style="width:68px">Date</th>
    <th>Seller</th><th style="width:82px">Phone</th><th>Product</th>
    <th style="width:80px">Serial #</th>
    <th style="text-align:right;width:76px">Price (৳)</th>
    <th style="text-align:right;width:68px">Paid (৳)</th>
    <th style="text-align:right;width:60px">Due (৳)</th>
    <th style="text-align:center;width:52px">Status</th>
  </tr></thead>
  <tbody>${tbody || "<tr><td colspan='10' style='text-align:center;padding:10px;color:#999;'>No records</td></tr>"}</tbody>
  <tfoot><tr>
    <td colspan="6">Total (${rows.length} records)</td>
    <td style="text-align:right;">${fmtN(totalPurchase)}</td>
    <td style="text-align:right;">${fmtN(totalPaid)}</td>
    <td style="text-align:right;">${fmtN(totalDue)}</td>
    <td></td>
  </tr></tfoot>
</table>`;
  return reportShell("Purchase Audit Report", dateLabel, fmtToday(), rows.length, cards, table);
}

// Service Report HTML
function buildServiceReportHTML(rows: any[], dateLabel: string, summary: any): string {
  const totalCost = rows.reduce((s: number, r: any) => s + Number(r.totalCost), 0);
  const totalPaid = rows.reduce((s: number, r: any) => s + Number(r.paidAmount), 0);
  const totalDue  = rows.reduce((s: number, r: any) => s + Number(r.dueAmount), 0);

  const tbody = rows.map((r: any, i: number) => {
    const bg = i % 2 === 1 ? "background:#fafafa;" : "";
    const due = Number(r.dueAmount);
    return `<tr style="${bg}">
      <td style="font-family:monospace;font-size:9px;">${r.serviceNumber}</td>
      <td>${fmtDate2(r.receivedDate || r.createdAt)}</td>
      <td>${r.customerName}</td><td>${r.customerPhone || ""}</td>
      <td>${r.deviceBrand} ${r.deviceModel}</td>
      <td style="text-align:center;">${r.status}</td>
      <td style="text-align:right;">${fmtN(r.totalCost)}</td>
      <td style="text-align:right;">${fmtN(r.paidAmount)}</td>
      <td style="text-align:right;">${due > 0 ? fmtN(due) : "—"}</td>
      <td style="text-align:center;">${r.paymentStatus}</td>
    </tr>`;
  }).join("");

  const cards = sc("Total", String(summary?.count ?? rows.length))
    + sc("Completed", String(summary?.completed ?? ""))
    + sc("Pending", String(summary?.pending ?? ""))
    + sc("Revenue", "৳" + fmtN(summary?.revenue ?? totalCost))
    + sc("Collected", "৳" + fmtN(summary?.collected ?? totalPaid))
    + sc("Due", "৳" + fmtN(summary?.due ?? totalDue));

  const table = `<table>
  <thead><tr>
    <th style="width:90px">Service #</th><th style="width:68px">Date</th>
    <th>Customer</th><th style="width:82px">Phone</th><th>Device</th>
    <th style="text-align:center;width:68px">Status</th>
    <th style="text-align:right;width:72px">Total (৳)</th>
    <th style="text-align:right;width:68px">Paid (৳)</th>
    <th style="text-align:right;width:60px">Due (৳)</th>
    <th style="text-align:center;width:52px">Payment</th>
  </tr></thead>
  <tbody>${tbody || "<tr><td colspan='10' style='text-align:center;padding:10px;color:#999;'>No records</td></tr>"}</tbody>
  <tfoot><tr>
    <td colspan="6">Total (${rows.length} records)</td>
    <td style="text-align:right;">${fmtN(totalCost)}</td>
    <td style="text-align:right;">${fmtN(totalPaid)}</td>
    <td style="text-align:right;">${fmtN(totalDue)}</td>
    <td></td>
  </tr></tfoot>
</table>`;
  return reportShell("Service Audit Report", dateLabel, fmtToday(), rows.length, cards, table);
}

// Inventory Report HTML
function buildInventoryReportHTML(rows: any[], summary: any): string {
  const totalValue = rows.reduce((s: number, r: any) => s + Number(r.stockItem?.purchasePrice ?? 0), 0);

  const tbody = rows.map((r: any, i: number) => {
    const si = r.stockItem || r;
    const pr = r.product || {};
    const bg = i % 2 === 1 ? "background:#fafafa;" : "";
    return `<tr style="${bg}">
      <td>${pr.brand || ""} ${pr.modelName || si.productName || ""}</td>
      <td style="font-family:monospace;font-size:9px;">${si.serialNumber || ""}</td>
      <td style="font-family:monospace;font-size:9px;">${si.imei || ""}</td>
      <td style="text-align:center;">${si.purchaseSource || ""}</td>
      <td>${si.supplierName || ""}</td>
      <td style="text-align:right;">${fmtN(si.purchasePrice)}</td>
      <td style="text-align:center;">${si.status}</td>
      <td>${fmtDate2(si.createdAt)}</td>
    </tr>`;
  }).join("");

  const cards = sc("Total Items", String(summary?.total ?? rows.length))
    + sc("Available", String(summary?.available ?? ""))
    + sc("Sold", String(summary?.sold ?? ""))
    + sc("In Service", String(summary?.inService ?? ""))
    + sc("Stock Value", "৳" + fmtN(summary?.stockValue ?? totalValue));

  const table = `<table>
  <thead><tr>
    <th>Product</th>
    <th style="width:90px">Serial #</th>
    <th style="width:90px">IMEI</th>
    <th style="text-align:center;width:64px">Source</th>
    <th>Supplier / Seller</th>
    <th style="text-align:right;width:76px">Cost (৳)</th>
    <th style="text-align:center;width:60px">Status</th>
    <th style="width:72px">Added</th>
  </tr></thead>
  <tbody>${tbody || "<tr><td colspan='8' style='text-align:center;padding:10px;color:#999;'>No records</td></tr>"}</tbody>
  <tfoot><tr>
    <td colspan="5">Total (${rows.length} records)</td>
    <td style="text-align:right;">${fmtN(totalValue)}</td>
    <td colspan="2"></td>
  </tr></tfoot>
</table>`;
  return reportShell("Inventory Report", "Live Snapshot", fmtToday(), rows.length, cards, table,
    `<p class="note">⚠ Inventory is a live snapshot — not filtered by date.</p>`);
}

// ── Main component ────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("profit");
  const [preset, setPreset] = useState<DatePreset>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Activity log state
  const [logSearch, setLogSearch] = useState("");
  const [logAction, setLogAction] = useState("all");
  const [logPage, setLogPage] = useState(1);

  // Sales list state (audit table)
  const [salesListPage, setSalesListPage] = useState(1);
  // Purchase / Service / Inventory list states
  const [purchaseListPage, setPurchaseListPage] = useState(1);
  const [serviceListPage, setServiceListPage]   = useState(1);
  const [stockListPage, setStockListPage]       = useState(1);

  // Compute active date range
  const { start, end } = preset === "custom"
    ? { start: customStart, end: customEnd }
    : getPresetDates(preset);

  const dateLabel = preset === "custom"
    ? (start && end ? `${start} – ${end}` : "All Time")
    : preset === "today" ? "Today"
    : preset === "week" ? "This Week"
    : preset === "month" ? "This Month"
    : "This Year";

  // Fetch summary
  const { data: report, isLoading: reportLoading, isFetching: reportFetching } = useQuery<ReportData>({
    queryKey: ["reports", "summary", start, end],
    queryFn: () => {
      const p: Record<string, string> = { type: "summary" };
      if (start) p.startDate = start;
      if (end) p.endDate = end;
      return apiClient.get<ReportData>("/api/reports", p);
    },
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // Fetch activity logs
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["reports", "activity", logSearch, logAction, logPage, start, end],
    queryFn: () => {
      const p: Record<string, string> = { type: "activity", page: String(logPage), limit: "50" };
      if (logSearch) p.search = logSearch;
      if (logAction !== "all") p.action = logAction;
      if (start) p.startDate = start;
      if (end) p.endDate = end;
      return apiClient.get<any>("/api/reports", p);
    },
    enabled: tab === "activity",
    staleTime: 30 * 1000,
  });

  const activityLogs: any[] = (activityData as any)?.logs || [];
  const activityPagination = (activityData as any)?.pagination;

  // Fetch sales list (for audit table in Sales tab)
  const { data: salesListData } = useQuery({
    queryKey: ["reports", "salesList", start, end, salesListPage],
    queryFn: () => {
      const p: Record<string, string> = { page: String(salesListPage), limit: "50" };
      if (start) p.startDate = start;
      if (end) p.endDate = end;
      return apiClient.get<any>("/api/sales", p);
    },
    enabled: tab === "sales",
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const salesList: any[] = (salesListData as any)?.sales || [];
  const salesListPagination = (salesListData as any)?.pagination;

  // Fetch purchases list
  const { data: purchaseListData } = useQuery({
    queryKey: ["reports", "purchaseList", start, end, purchaseListPage],
    queryFn: () => {
      const p: Record<string, string> = { page: String(purchaseListPage), limit: "50" };
      if (start) p.startDate = start;
      if (end)   p.endDate   = end;
      return apiClient.get<any>("/api/purchases", p);
    },
    enabled: tab === "purchase",
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const purchaseList: any[] = (purchaseListData as any)?.purchases || [];
  const purchaseListPagination = (purchaseListData as any)?.pagination;

  // Fetch services list
  const { data: serviceListData } = useQuery({
    queryKey: ["reports", "serviceList", start, end, serviceListPage],
    queryFn: () => {
      const p: Record<string, string> = { page: String(serviceListPage), limit: "50" };
      if (start) p.startDate = start;
      if (end)   p.endDate   = end;
      return apiClient.get<any>("/api/services", p);
    },
    enabled: tab === "service",
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const serviceList: any[] = (serviceListData as any)?.services || [];
  const serviceListPagination = (serviceListData as any)?.pagination;

  // Fetch inventory/stock list
  const { data: stockListData } = useQuery({
    queryKey: ["reports", "stockList", stockListPage],
    queryFn: () => {
      const p: Record<string, string> = { page: String(stockListPage), limit: "50" };
      return apiClient.get<any>("/api/stock", p);
    },
    enabled: tab === "inventory",
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const stockList: any[] = (stockListData as any)?.stockItems || [];
  const stockListPagination = (stockListData as any)?.pagination;

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportXLSX = async () => {
    if (!report) return;
    if (tab === "sales") {
      if (salesList.length > 0) {
        // Export the actual list rows
        const data = salesList.map((s: any) => ({
          "Invoice #":     s.invoiceNumber,
          "Date":          new Date(s.invoiceDate || s.createdAt).toLocaleDateString("en-BD"),
          "Customer":      s.customerName,
          "Phone":         s.customerPhone,
          "Grand Total":   Number(s.grandTotal),
          "Paid":          Number(s.paidAmount),
          "Due":           Number(s.dueAmount),
          "Status":        s.paymentStatus || s.status,
        }));
        await exportXLSX(data, "Sales Report", `sales-report-${start || "all"}`);
      } else {
        const data = [
          { Metric: "Total Sales", Value: report.sales.count },
          { Metric: "Revenue", Value: report.sales.revenue },
          { Metric: "Collected", Value: report.sales.collected },
          { Metric: "Due", Value: report.sales.due },
        ];
        await exportXLSX(data, "Sales Report", `sales-report-${start || "all"}`);
      }
    } else if (tab === "profit") {
      const r = report.profit;
      const data = [
        { Metric: "Sales Revenue", Value: r.salesRevenue },
        { Metric: "Service Revenue", Value: r.serviceRevenue },
        { Metric: "Total Revenue", Value: r.totalRevenue },
        { Metric: "Sales Gross Profit", Value: r.salesGrossProfit },
        { Metric: "Service Gross Profit", Value: r.serviceGrossProfit },
        { Metric: "Total Gross Profit", Value: r.totalGrossProfit },
        { Metric: "Total Expenses", Value: r.totalExpenses },
        { Metric: "Net Profit", Value: r.netProfit },
        { Metric: "Net Margin %", Value: r.profitMargin },
        { Metric: "Gross Margin %", Value: r.grossMargin },
      ];
      await exportXLSX(data, "P&L Report", `profit-report-${start || "all"}`);
    } else if (tab === "expense") {
      const data = report.expenses.byCategory.map(c => ({
        Category: c.category,
        Count: c.count,
        "Total Amount": c.total,
      }));
      await exportXLSX(data, "Expenses", `expense-report-${start || "all"}`);
    } else if (tab === "service") {
      const s = report.services;
      const data = [
        { Metric: "Total Services", Value: s.count },
        { Metric: "Completed", Value: s.completed },
        { Metric: "Pending", Value: s.pending },
        { Metric: "Revenue", Value: s.revenue },
        { Metric: "Collected", Value: s.collected },
        { Metric: "Due", Value: s.due },
        { Metric: "Gross Profit", Value: s.grossProfit },
      ];
      await exportXLSX(data, "Services", `service-report-${start || "all"}`);
    }
  };

  const handleExportPDF = async () => {
    if (!report) return;
    if (tab === "profit") {
      const r = report.profit;
      const rows: (string | number)[][] = [
        ["Sales Revenue",         formatCurrency(r.salesRevenue)],
        ["Service Revenue",       formatCurrency(r.serviceRevenue)],
        ["Total Revenue",         formatCurrency(r.totalRevenue)],
        ["Sales Gross Profit",    formatCurrency(r.salesGrossProfit)],
        ["Service Gross Profit",  formatCurrency(r.serviceGrossProfit)],
        ["Total Gross Profit",    formatCurrency(r.totalGrossProfit)],
        ["Total Expenses",       `(${formatCurrency(r.totalExpenses)})`],
        ["Net Profit / (Loss)",   formatCurrency(r.netProfit)],
        ["Net Margin",            `${r.profitMargin.toFixed(2)}%`],
        ["Gross Margin",          `${r.grossMargin.toFixed(2)}%`],
      ];
      await exportPDF("Profit & Loss Statement", dateLabel, ["Metric", "Amount"], rows, `pl-report-${start || "all"}`);
    } else if (tab === "expense") {
      const rows: (string | number)[][] = report.expenses.byCategory.map(c => [c.category, c.count, formatCurrency(c.total)]);
      await exportPDF("Expense Report", dateLabel, ["Category", "Count", "Amount"], rows, `expense-report-${start || "all"}`);
    } else if (tab === "sales") {
      const html = buildSalesReportHTML(salesList, dateLabel, report.sales);
      const w = window.open("", "_blank", "width=1000,height=700");
      if (!w) { alert("Please allow pop-ups to print/download"); return; }
      w.document.write(html); w.document.close();
    } else if (tab === "purchase") {
      const html = buildPurchaseReportHTML(purchaseList, dateLabel, report);
      const w = window.open("", "_blank", "width=1000,height=700");
      if (!w) { alert("Please allow pop-ups to print/download"); return; }
      w.document.write(html); w.document.close();
    } else if (tab === "service" && serviceList.length > 0) {
      const html = buildServiceReportHTML(serviceList, dateLabel, report.services);
      const w = window.open("", "_blank", "width=1000,height=700");
      if (!w) { alert("Please allow pop-ups to print/download"); return; }
      w.document.write(html); w.document.close();
    } else if (tab === "inventory" && stockList.length > 0) {
      const html = buildInventoryReportHTML(stockList, (stockListData as any)?.stats);
      const w = window.open("", "_blank", "width=1000,height=700");
      if (!w) { alert("Please allow pop-ups to print/download"); return; }
      w.document.write(html); w.document.close();
    }
  };

  const isLoading = reportLoading;
  const isFetching = reportFetching;

  if (isLoading && !report) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Business analytics · <span className="font-medium text-blue-600">{dateLabel}</span>
            {isFetching && <span className="ml-2 text-xs text-gray-400">Refreshing...</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportXLSX}
            className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            XLSX
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          ["profit",    "Profit & Loss"],
          ["sales",     "Sales"],
          ["purchase",  "Purchases"],
          ["service",   "Services"],
          ["expense",   "Expenses"],
          ["inventory", "Inventory"],
          ["activity",  "Activity Log"],
        ] as [ReportTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              tab === id
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Date Range */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {(["today", "week", "month", "year", "custom"] as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                preset === p
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {p === "today" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : p === "year" ? "This Year" : "Custom"}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <span className="text-gray-400">→</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
        )}
      </div>

      {/* ── Report Content ─────────────────────────────────────────────────── */}

      {/* PROFIT & LOSS */}
      {tab === "profit" && report && (
        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Revenue" value={formatCurrency(report.profit.totalRevenue)} sub={`Sales + Services`} color="blue" large />
            <StatCard label="Gross Profit" value={formatCurrency(report.profit.totalGrossProfit)} sub={`Margin: ${report.profit.grossMargin.toFixed(1)}%`} color="green" large />
            <StatCard label="Total Expenses" value={formatCurrency(report.profit.totalExpenses)} color="red" large />
            <StatCard
              label="Net Profit / Loss"
              value={formatCurrency(report.profit.netProfit)}
              sub={`Net margin: ${report.profit.profitMargin.toFixed(1)}%`}
              color={report.profit.isProfit ? "green" : "red"}
              large
            />
          </div>

          {/* Breakdown table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Profit & Loss Statement — {dateLabel}</h3>
            </div>
            <div className="p-6">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { label: "Sales Revenue",          value: report.profit.salesRevenue,        indent: false, color: "blue"  },
                    { label: "Service Revenue",         value: report.profit.serviceRevenue,       indent: true,  color: "blue"  },
                    { label: "Total Revenue",           value: report.profit.totalRevenue,         indent: false, color: "blue",  bold: true },
                    { label: "Sales Gross Profit",      value: report.profit.salesGrossProfit,     indent: false, color: "green" },
                    { label: "Service Gross Profit",    value: report.profit.serviceGrossProfit,   indent: true,  color: "green" },
                    { label: "Total Gross Profit",      value: report.profit.totalGrossProfit,     indent: false, color: "green", bold: true },
                    { label: "Less: Total Expenses",    value: -report.profit.totalExpenses,       indent: false, color: "red"   },
                    { label: "Net Profit / (Loss)",     value: report.profit.netProfit,            indent: false, color: report.profit.isProfit ? "green" : "red", bold: true },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className={`py-3 text-gray-700 dark:text-gray-300 ${row.indent ? "pl-8 text-gray-400" : ""} ${row.bold ? "font-bold" : ""}`}>
                        {row.label}
                      </td>
                      <td className={`py-3 text-right font-mono ${row.bold ? "font-bold text-base" : ""} ${
                        row.color === "blue" ? "text-blue-600 dark:text-blue-400"
                        : row.color === "green" ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                      }`}>
                        {row.value < 0 ? `(${formatCurrency(Math.abs(row.value))})` : formatCurrency(row.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="flex-1 rounded-xl bg-gray-50 p-4 text-center dark:bg-gray-800">
                  <p className="text-xs text-gray-500">Gross Margin</p>
                  <p className="text-xl font-bold text-green-600">{report.profit.grossMargin.toFixed(2)}%</p>
                </div>
                <div className="flex-1 rounded-xl bg-gray-50 p-4 text-center dark:bg-gray-800">
                  <p className="text-xs text-gray-500">Net Margin</p>
                  <p className={`text-xl font-bold ${report.profit.isProfit ? "text-green-600" : "text-red-600"}`}>{report.profit.profitMargin.toFixed(2)}%</p>
                </div>
                <div className="flex-1 rounded-xl bg-gray-50 p-4 text-center dark:bg-gray-800">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`text-xl font-bold ${report.profit.isProfit ? "text-green-600" : "text-red-600"}`}>
                    {report.profit.isProfit ? "✅ Profit" : "❌ Loss"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SALES */}
      {tab === "sales" && report && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Sales" value={String(report.sales.count)} />
            <StatCard label="Revenue" value={formatCurrency(report.sales.revenue)} color="blue" />
            <StatCard label="Collected" value={formatCurrency(report.sales.collected)} color="green" />
            <StatCard label="Due" value={formatCurrency(report.sales.due)} color="red" />
            <StatCard label="Gross Profit" value={formatCurrency(report.sales.grossProfit)} color="green" sub="Revenue - Cost" />
            <StatCard label="Net Returns" value={formatCurrency(report.sales.returned)} color="orange" />
            <StatCard label="Average Order" value={formatCurrency(report.sales.avgOrder)} />
          </div>

          {/* Audit table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Sales Audit List — {dateLabel}</h3>
              <span className="text-sm text-gray-400">{salesListPagination?.total || salesList.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Invoice #</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Phone</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Total</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Paid</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Due</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {salesList.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No sales found for this period.</td></tr>
                  ) : (
                    salesList.map((s: any) => {
                      const due = Number(s.dueAmount);
                      const paid = Number(s.paidAmount);
                      const total = Number(s.grandTotal);
                      const status = s.paymentStatus || (due <= 0 ? "Paid" : paid > 0 ? "Partial" : "Pending");
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="px-4 py-3 font-mono text-xs font-medium text-purple-600 dark:text-purple-400">{s.invoiceNumber}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(s.invoiceDate || s.createdAt)}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.customerName}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.customerPhone}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(total)}</td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{formatCurrency(paid)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${due > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}>
                            {due > 0 ? formatCurrency(due) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              status === "Paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : status === "Partial" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            }`}>{status}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {salesList.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                      <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                        Total ({salesList.length} records)
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatCurrency(salesList.reduce((s: number, r: any) => s + Number(r.grandTotal), 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatCurrency(salesList.reduce((s: number, r: any) => s + Number(r.paidAmount), 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(salesList.reduce((s: number, r: any) => s + Number(r.dueAmount), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {/* Pagination */}
            {salesListPagination && salesListPagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 dark:border-gray-800">
                <span className="text-sm text-gray-400">Page {salesListPage} of {salesListPagination.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={salesListPage <= 1}
                    onClick={() => setSalesListPage(p => p - 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >← Prev</button>
                  <button
                    disabled={salesListPage >= salesListPagination.totalPages}
                    onClick={() => setSalesListPage(p => p + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PURCHASE */}
      {tab === "purchase" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Purchases" value={String(purchaseListPagination?.total ?? purchaseList.length)} />
            <StatCard label="Total Value" value={formatCurrency(purchaseList.reduce((s: number, r: any) => s + Number(r.purchasePrice), 0))} color="blue" />
            <StatCard label="Paid" value={formatCurrency(purchaseList.reduce((s: number, r: any) => s + Number(r.paidAmount), 0))} color="green" />
            <StatCard label="Due" value={formatCurrency(purchaseList.reduce((s: number, r: any) => s + Number(r.dueAmount ?? 0), 0))} color="red" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Purchase Audit List — {dateLabel}</h3>
              <span className="text-sm text-gray-400">{purchaseListPagination?.total ?? purchaseList.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                    {["Invoice #","Date","Seller","Phone","Product","Serial #","Price","Paid","Due","Status"].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {purchaseList.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No purchases found for this period.</td></tr>
                  ) : purchaseList.map((r: any) => {
                    const due = Number(r.dueAmount ?? 0);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-3 py-3 font-mono text-xs font-medium text-blue-600 dark:text-blue-400">{r.invoiceNumber}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{formatDate(r.purchaseDate || r.createdAt)}</td>
                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{r.sellerName}</td>
                        <td className="px-3 py-3 text-gray-500">{r.sellerPhone}</td>
                        <td className="px-3 py-3 text-gray-800 dark:text-gray-200">{r.productName}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-500">{r.serialNumber}</td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(r.purchasePrice))}</td>
                        <td className="px-3 py-3 text-right text-gray-600">{formatCurrency(Number(r.paidAmount))}</td>
                        <td className={`px-3 py-3 text-right font-medium ${due > 0 ? "text-red-600" : "text-gray-400"}`}>{due > 0 ? formatCurrency(due) : "—"}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.paymentStatus === "paid" ? "bg-green-100 text-green-700"
                            : r.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                          }`}>{r.paymentStatus}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {purchaseList.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                      <td colSpan={6} className="px-3 py-3 font-semibold text-gray-700">Total ({purchaseList.length} records)</td>
                      <td className="px-3 py-3 text-right font-bold">{formatCurrency(purchaseList.reduce((s: number, r: any) => s + Number(r.purchasePrice), 0))}</td>
                      <td className="px-3 py-3 text-right font-bold">{formatCurrency(purchaseList.reduce((s: number, r: any) => s + Number(r.paidAmount), 0))}</td>
                      <td className="px-3 py-3 text-right font-bold text-red-600">{formatCurrency(purchaseList.reduce((s: number, r: any) => s + Number(r.dueAmount ?? 0), 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {purchaseListPagination && purchaseListPagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                <span className="text-sm text-gray-400">Page {purchaseListPage} of {purchaseListPagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={purchaseListPage <= 1} onClick={() => setPurchaseListPage(p => p - 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                  <button disabled={purchaseListPage >= purchaseListPagination.totalPages} onClick={() => setPurchaseListPage(p => p + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SERVICES */}
      {tab === "service" && report && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Services" value={String(report.services.count)} />
            <StatCard label="Completed" value={String(report.services.completed)} color="green" />
            <StatCard label="Pending" value={String(report.services.pending)} color="orange" />
            <StatCard label="Revenue" value={formatCurrency(report.services.revenue)} color="blue" />
            <StatCard label="Collected" value={formatCurrency(report.services.collected)} color="green" />
            <StatCard label="Due" value={formatCurrency(report.services.due)} color="red" />
            <StatCard label="Gross Profit" value={formatCurrency(report.services.grossProfit)} color="green" sub="Charge - Parts" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Service Audit List — {dateLabel}</h3>
              <span className="text-sm text-gray-400">{serviceListPagination?.total ?? serviceList.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                    {["Service #","Date","Customer","Phone","Device","Status","Total","Paid","Due","Payment"].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {serviceList.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No services found for this period.</td></tr>
                  ) : serviceList.map((r: any) => {
                    const due = Number(r.dueAmount);
                    const ps = r.paymentStatus;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-3 py-3 font-mono text-xs font-medium text-purple-600 dark:text-purple-400">{r.serviceNumber}</td>
                        <td className="px-3 py-3 text-gray-600">{formatDate(r.receivedDate || r.createdAt)}</td>
                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{r.customerName}</td>
                        <td className="px-3 py-3 text-gray-500">{r.customerPhone}</td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{r.deviceBrand} {r.deviceModel}</td>
                        <td className="px-3 py-3"><span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{r.status}</span></td>
                        <td className="px-3 py-3 text-right font-semibold">{formatCurrency(Number(r.totalCost))}</td>
                        <td className="px-3 py-3 text-right text-gray-600">{formatCurrency(Number(r.paidAmount))}</td>
                        <td className={`px-3 py-3 text-right ${due > 0 ? "text-red-600 font-medium" : "text-gray-400"}`}>{due > 0 ? formatCurrency(due) : "—"}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            ps === "Paid" ? "bg-green-100 text-green-700" : ps === "Partial" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                          }`}>{ps}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {serviceList.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                      <td colSpan={6} className="px-3 py-3 font-semibold text-gray-700">Total ({serviceList.length} records)</td>
                      <td className="px-3 py-3 text-right font-bold">{formatCurrency(serviceList.reduce((s: number, r: any) => s + Number(r.totalCost), 0))}</td>
                      <td className="px-3 py-3 text-right font-bold">{formatCurrency(serviceList.reduce((s: number, r: any) => s + Number(r.paidAmount), 0))}</td>
                      <td className="px-3 py-3 text-right font-bold text-red-600">{formatCurrency(serviceList.reduce((s: number, r: any) => s + Number(r.dueAmount), 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {serviceListPagination && serviceListPagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                <span className="text-sm text-gray-400">Page {serviceListPage} of {serviceListPagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={serviceListPage <= 1} onClick={() => setServiceListPage(p => p - 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                  <button disabled={serviceListPage >= serviceListPagination.totalPages} onClick={() => setServiceListPage(p => p + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXPENSES */}
      {tab === "expense" && report && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Expenses" value={formatCurrency(report.expenses.total)} color="red" large />
            <StatCard label="Transactions" value={String(report.expenses.count)} />
            <StatCard label="Avg per Expense" value={formatCurrency(report.expenses.count > 0 ? report.expenses.total / report.expenses.count : 0)} />
          </div>
          {report.expenses.byCategory.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">By Category</h3>
              <div className="space-y-3">
                {report.expenses.byCategory.map((c) => {
                  const pct = report.expenses.total > 0 ? (c.total / report.expenses.total) * 100 : 0;
                  return (
                    <div key={c.category}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{c.category}</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatCurrency(c.total)} <span className="ml-1 text-xs text-gray-400">({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* INVENTORY */}
      {tab === "inventory" && report && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">📌 Inventory is a live snapshot — not date-filtered.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total Items" value={String(report.inventory.total)} />
            <StatCard label="Available" value={String(report.inventory.available)} color="green" />
            <StatCard label="Sold" value={String(report.inventory.sold)} color="blue" />
            <StatCard label="In Service" value={String(report.inventory.inService)} color="orange" />
            <StatCard label="Stock Value" value={formatCurrency(report.inventory.stockValue)} color="purple" sub="Available items cost" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Stock Inventory List</h3>
              <span className="text-sm text-gray-400">{stockListPagination?.total ?? stockList.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                    {["Product","Serial #","IMEI","Source","Supplier/Seller","Cost","Status","Added"].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {stockList.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No stock items found.</td></tr>
                  ) : stockList.map((r: any) => {
                    const si = r.stockItem || r;
                    const pr = r.product || {};
                    return (
                      <tr key={si.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{pr.brand} {pr.modelName}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-600">{si.serialNumber}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-500">{si.imei || "—"}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{si.purchaseSource}</span>
                        </td>
                        <td className="px-3 py-3 text-gray-600">{si.supplierName || "—"}</td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatCurrency(Number(si.purchasePrice))}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            si.status === "Available" ? "bg-green-100 text-green-700"
                            : si.status === "Sold" ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-700"
                          }`}>{si.status}</span>
                        </td>
                        <td className="px-3 py-3 text-gray-500">{formatDate(si.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {stockList.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                      <td colSpan={5} className="px-3 py-3 font-semibold text-gray-700">Total ({stockList.length} items)</td>
                      <td className="px-3 py-3 text-right font-bold">{formatCurrency(stockList.reduce((s: number, r: any) => s + Number((r.stockItem || r).purchasePrice), 0))}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {stockListPagination && stockListPagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                <span className="text-sm text-gray-400">Page {stockListPage} of {stockListPagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={stockListPage <= 1} onClick={() => setStockListPage(p => p - 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                  <button disabled={stockListPage >= stockListPagination.totalPages} onClick={() => setStockListPage(p => p + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY LOG */}
      {tab === "activity" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900 md:flex-row md:items-center">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search user, action, details..."
                value={logSearch}
                onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }}
                className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <select
              value={logAction}
              onChange={(e) => { setLogAction(e.target.value); setLogPage(1); }}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Actions</option>
              <option value="SALE">Sales</option>
              <option value="PURCHASE">Purchases</option>
              <option value="EXPENSE">Expenses</option>
              <option value="SERVICE">Services</option>
              <option value="SUPPLIER">Suppliers</option>
              <option value="CUSTOMER">Customers</option>
              <option value="LOGIN">Login</option>
              <option value="STOCK">Stock</option>
            </select>
          </div>

          {/* Log list */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Activity Log</h3>
              <span className="text-xs text-gray-400">{activityPagination?.total ?? 0} entries</span>
            </div>
            {activityLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">No activity logs found</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {activityLogs.map((log: any) => (
                  <div key={log.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(log.createdAt, "datetime")}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-bold ${
                            log.userRole === "admin" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
                          }`}>{log.userRole}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{log.details}</p>
                        <p className="mt-0.5 text-xs text-gray-400">By: {log.userName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activityPagination && activityPagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                <button disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)}
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  ← Prev
                </button>
                <span className="text-sm text-gray-500">Page {logPage} of {activityPagination.totalPages}</span>
                <button disabled={logPage >= activityPagination.totalPages} onClick={() => setLogPage(p => p + 1)}
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
