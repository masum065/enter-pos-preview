"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { apiClient } from "@/lib/api-client";

interface Sale {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  items: any[];
  payments: any[];
  subtotal: number | string;
  discountAmount: number | string;
  grandTotal: number | string;
  paidAmount: number | string;
  dueAmount: number | string;
  status: string;
  [key: string]: any;
}

// ── helpers ───────────────────────────────────────────────────────────────
function fmt(n: number | string): string {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | Date): string {
  const date = new Date(d);
  const dd  = String(date.getDate()).padStart(2, "0");
  const mon = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][date.getMonth()];
  return `${dd}-${mon}-${String(date.getFullYear()).slice(-2)}`;
}

function fmtDateTime(d: string | Date): string {
  const date = new Date(d);
  const dd  = String(date.getDate()).padStart(2, "0");
  const mm  = String(date.getMonth() + 1).padStart(2, "0");
  const yy  = date.getFullYear();
  let h     = date.getHours();
  const min = String(date.getMinutes()).padStart(2, "0");
  const ap  = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${dd}-${mm}-${yy} ${h}:${min} ${ap}`;
}

function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
    "Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function below1000(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + below1000(num % 100) : "");
  }
  const crore = Math.floor(n / 10000000);
  const lakh  = Math.floor((n % 10000000) / 100000);
  const thou  = Math.floor((n % 100000) / 1000);
  const rest  = Math.floor(n % 1000);
  const parts: string[] = [];
  if (crore) parts.push(below1000(crore) + " Crore");
  if (lakh)  parts.push(below1000(lakh)  + " Lakh");
  if (thou)  parts.push(below1000(thou)  + " Thousand");
  if (rest)  parts.push(below1000(rest));
  return parts.join(" ");
}

function amountInWords(amount: number): string {
  const whole = Math.floor(amount);
  const paise = Math.round((amount - whole) * 100);
  let result = "BDT " + numberToWords(whole);
  if (paise > 0) result += " and " + numberToWords(paise) + " Paisa";
  return result + " Only";
}

// ── Build printable HTML ──────────────────────────────────────────────────
function buildInvoiceHTML(sale: Sale): string {
  const grandTotal = Number(sale.grandTotal);
  const paidAmount = Number(sale.paidAmount);
  const dueAmount  = Number(sale.dueAmount);
  const discount   = Number(sale.discountAmount);
  const subtotal   = (sale.items || []).reduce((s: number, i: any) => s + Number(i.amount || i.salePrice || 0), 0);

  const itemRows = (sale.items || []).map((item: any, i: number) => `
    <tr>
      <td class="at">${i + 1}</td>
      <td class="at">
        <div>${item.productName || item.name || ""}</div>
        ${item.warranty ? `<div style="color:#555;font-size:10px;">${item.warranty}</div>` : ""}
      </td>
      <td class="at mono">${item.serialNumber || item.serial || ""}</td>
      <td class="at tc">${item.quantity || item.qty || 1}</td>
      <td class="at tr">${fmt(item.salePrice || item.price || 0)}</td>
      <td class="at tr">${fmt(item.amount || item.total || 0)}</td>
    </tr>`).join("");

  const payRows = (sale.payments || []).map((p: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td>${fmtDateTime(p.paidAt || p.date || new Date())}</td>
      <td>${p.method || p.type || ""}</td>
      <td>${p.reference || ""}</td>
      <td class="tr">${fmt(Number(p.amount))}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${sale.invoiceNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1a1a1a;background:#fff;padding:28px 32px;}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
  .logo{font-size:26px;font-weight:900;font-style:italic;letter-spacing:-0.5px;}
  .shop-name{font-weight:700;font-size:11px;margin-top:4px;}
  .shop-addr{font-size:10px;color:#555;max-width:300px;line-height:1.4;margin-top:2px;}
  .inv-box{border:1px solid #9ca3af;font-size:11px;}
  .inv-box-title{text-align:center;font-weight:700;border-bottom:1px solid #9ca3af;padding:4px 16px;}
  .inv-box-row{padding:4px 16px;border-bottom:1px solid #e5e7eb;}
  .inv-box-row:last-child{border-bottom:none;}
  hr{border:none;border-top:1px solid #9ca3af;margin:8px 0;}
  .cust-row{display:flex;flex-wrap:wrap;gap:0 20px;margin-bottom:4px;}
  table{width:100%;border-collapse:collapse;}
  th,td{border:1px solid #9ca3af;padding:4px 8px;font-size:11px;}
  thead th{background:#f3f4f6;font-weight:700;}
  .tr{text-align:right;} .tc{text-align:center;} .at{vertical-align:top;}
  .mono{font-family:monospace;} .fw7{font-weight:700;} .fw6{font-weight:600;}
  .note{font-size:10px;color:#555;margin:4px 0;}
  .paid-due{text-align:right;font-weight:700;font-size:11px;margin:4px 0;}
  .due-red{color:#dc2626;}
  ol.terms{padding-left:16px;}
  ol.terms li{font-size:10px;color:#444;line-height:1.5;margin-bottom:2px;}
  .footer-note{text-align:center;font-size:9px;color:#9ca3af;margin-top:20px;}
  @media print{
    @page{size:A4;margin:10mm 12mm;}
    body{padding:0!important;}
  }
</style>
</head>
<body>
  <div class="hdr">
    <div>
      <div class="logo">ENTER</div>
      <div class="shop-name">Enter Computers</div>
      <div class="shop-addr">Dhaka, Bangladesh<br>Phone: +880 1234-567890 | info@entercomputers.com</div>
    </div>
    <div class="inv-box">
      <div class="inv-box-title">Invoice / Bill</div>
      <div class="inv-box-row">NO: <strong>${sale.invoiceNumber}</strong></div>
      <div class="inv-box-row">Date: ${fmtDate(sale.invoiceDate)}</div>
    </div>
  </div>
  <hr/>
  <div style="margin-bottom:8px;">
    <div class="cust-row">
      <span><strong>Customer:</strong> ${sale.customerName}</span>
      <span><strong>Phone:</strong> ${sale.customerPhone}</span>
    </div>
  </div>

  <table style="margin-bottom:6px;">
    <thead>
      <tr>
        <th style="width:28px">SL.</th>
        <th>ITEM</th>
        <th class="mono" style="width:120px">SERIAL NO.</th>
        <th class="tc" style="width:36px">QTY</th>
        <th class="tr" style="width:80px">PRICE</th>
        <th class="tr" style="width:80px">TOTAL</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr><td colspan="4"></td><td class="tr fw6">Total</td><td class="tr">${fmt(subtotal)}</td></tr>
      ${discount > 0 ? `<tr><td colspan="4"></td><td class="tr fw6">Discount</td><td class="tr">(${fmt(discount)})</td></tr>` : ""}
      <tr><td colspan="4"></td><td class="tr fw7">Grand Total</td><td class="tr fw7">${fmt(grandTotal)}</td></tr>
    </tfoot>
  </table>

  <div style="font-size:11px;margin-bottom:2px;"><strong>Amount In Words:</strong> ${amountInWords(grandTotal)}</div>
  <div class="paid-due">
    <span>Paid: ${fmt(paidAmount)} Tk</span>&nbsp;&nbsp;
    <span class="${dueAmount > 0 ? "due-red" : ""}">Due: ${fmt(dueAmount)} Tk</span>
  </div>
  <p class="note">Good received by customer in good condition.</p>

  ${sale.payments?.length > 0 ? `
  <div style="margin-top:10px;margin-bottom:10px;">
    <div class="fw7" style="font-size:11px;margin-bottom:4px;">Payment History</div>
    <table>
      <thead><tr><th style="width:28px">Sl.</th><th>Date</th><th style="width:80px">Method</th><th>Reference</th><th class="tr" style="width:90px">Amount</th></tr></thead>
      <tbody>${payRows}</tbody>
      <tfoot><tr><td colspan="4" class="fw7">Total</td><td class="tr fw7">${fmt(paidAmount)}</td></tr></tfoot>
    </table>
  </div>` : ""}

  <p class="note">VAT and TAX not included if not mentioned in the item field.</p>

  <div style="margin-top:10px;">
    <div class="fw7" style="font-size:11px;margin-bottom:4px;">Terms &amp; Conditions:</div>
    <ol class="terms">
      <li>Goods once sold will not be refunded &amp; exchanged without valid reason.</li>
      <li>Products under warranty will be repaired or replaced per manufacturer policy.</li>
      <li>Warranty does not cover: physical damage, liquid spillage, removed stickers, software/data, or accessories.</li>
      <li>Please retain this invoice for all warranty claims.</li>
    </ol>
  </div>
  <div style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
    <div style="display:inline-block;text-align:center;min-width:200px;">
      <div style="height:48px;"></div>
      <div style="border-top:1px dotted #9ca3af;padding-top:4px;font-size:10px;">Issued By</div>
      <div style="font-size:10px;color:#555;margin-top:2px;">Enter Computers</div>
      <div style="margin-top:6px;font-size:10px;color:#555;">Date: _______________</div>
    </div>
  </div>

  <div class="footer-note" style="margin-top:12px;">This is a system generated invoice &mdash; seal &amp; sign are not mandatory.</div>

  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body>
</html>`;
}

// ── Modal Component ───────────────────────────────────────────────────────
export function InvoicePrintModal({
  sale,
  isOpen,
  onClose,
}: {
  sale: Sale;
  isOpen: boolean;
  onClose: () => void;
}) {
  const grandTotal = Number(sale.grandTotal);
  const paidAmount = Number(sale.paidAmount);
  const dueAmount  = Number(sale.dueAmount);
  const discount   = Number(sale.discountAmount);
  const subtotal   = (sale.items || []).reduce((s: number, i: any) => s + Number(i.amount || i.salePrice || 0), 0);

  const handlePrint = () => {
    const html = buildInvoiceHTML(sale);
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Please allow pop-ups to print the invoice"); return; }
    w.document.write(html);
    w.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Preview" size="lg">
      {/* ── Invoice preview ─────────────────────────────────── */}
      <div
        style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 11, color: "#1a1a1a" }}
        className="max-h-[65vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 text-left dark:border-gray-700 dark:bg-white"
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, fontStyle: "italic", letterSpacing: -0.5 }}>ENTER</div>
            <div style={{ fontWeight: 700, fontSize: 11, marginTop: 3 }}>Enter Computers</div>
            <div style={{ fontSize: 10, color: "#555", lineHeight: 1.4, marginTop: 2, maxWidth: 260 }}>
              Dhaka, Bangladesh<br />
              Phone: +880 1234-567890 | info@entercomputers.com
            </div>
          </div>
          <div style={{ border: "1px solid #9ca3af", fontSize: 11 }}>
            <div style={{ textAlign: "center", fontWeight: 700, borderBottom: "1px solid #9ca3af", padding: "4px 16px" }}>Invoice / Bill</div>
            <div style={{ padding: "4px 16px", borderBottom: "1px solid #e5e7eb" }}>NO: <strong>{sale.invoiceNumber}</strong></div>
            <div style={{ padding: "4px 16px" }}>Date: {fmtDate(sale.invoiceDate)}</div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #9ca3af", margin: "8px 0" }} />

        {/* Customer */}
        <div style={{ marginBottom: 8, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <span><strong>Customer:</strong> {sale.customerName}</span>
          <span><strong>Phone:</strong> {sale.customerPhone}</span>
        </div>

        {/* Items */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6 }}>
          <thead>
            <tr>
              <th style={thStyle({ width: 28 })}>SL.</th>
              <th style={thStyle()}>ITEM</th>
              <th style={thStyle({ width: 110, fontFamily: "monospace" })}>SERIAL NO.</th>
              <th style={thStyle({ width: 36, textAlign: "center" })}>QTY</th>
              <th style={thStyle({ width: 80, textAlign: "right" })}>PRICE</th>
              <th style={thStyle({ width: 80, textAlign: "right" })}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {(sale.items || []).map((item: any, i: number) => (
              <tr key={i}>
                <td style={tdStyle({ verticalAlign: "top" })}>{i + 1}</td>
                <td style={tdStyle({ verticalAlign: "top" })}>
                  <div>{item.productName || item.name}</div>
                  {item.warranty && <div style={{ color: "#555", fontSize: 10 }}>{item.warranty}</div>}
                </td>
                <td style={tdStyle({ verticalAlign: "top", fontFamily: "monospace" })}>{item.serialNumber || item.serial}</td>
                <td style={tdStyle({ verticalAlign: "top", textAlign: "center" })}>{item.quantity || item.qty || 1}</td>
                <td style={tdStyle({ verticalAlign: "top", textAlign: "right" })}>{fmt(item.salePrice || item.price || 0)}</td>
                <td style={tdStyle({ verticalAlign: "top", textAlign: "right" })}>{fmt(item.amount || item.total || 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}></td>
              <td style={tdStyle({ textAlign: "right", fontWeight: 600 })}>Total</td>
              <td style={tdStyle({ textAlign: "right" })}>{fmt(subtotal)}</td>
            </tr>
            {discount > 0 && (
              <tr>
                <td colSpan={4}></td>
                <td style={tdStyle({ textAlign: "right", fontWeight: 600 })}>Discount</td>
                <td style={tdStyle({ textAlign: "right" })}>({fmt(discount)})</td>
              </tr>
            )}
            <tr>
              <td colSpan={4}></td>
              <td style={tdStyle({ textAlign: "right", fontWeight: 700 })}>Grand Total</td>
              <td style={tdStyle({ textAlign: "right", fontWeight: 700 })}>{fmt(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Amount words + paid/due */}
        <div style={{ fontSize: 11, marginBottom: 2 }}>
          <strong>Amount In Words:</strong> {amountInWords(grandTotal)}
        </div>
        <div style={{ textAlign: "right", fontWeight: 700, fontSize: 11, margin: "4px 0" }}>
          <span>Paid: {fmt(paidAmount)} Tk</span>&nbsp;&nbsp;
          <span style={{ color: dueAmount > 0 ? "#dc2626" : "inherit" }}>Due: {fmt(dueAmount)} Tk</span>
        </div>
        <p style={{ fontSize: 10, color: "#555", margin: "4px 0" }}>Good received by customer in good condition.</p>

        {/* Payments */}
        {(sale.payments || []).length > 0 && (
          <div style={{ marginTop: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>Payment History</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle({ width: 28 })}>Sl.</th>
                  <th style={thStyle()}>Date</th>
                  <th style={thStyle({ width: 80 })}>Method</th>
                  <th style={thStyle()}>Reference</th>
                  <th style={thStyle({ width: 90, textAlign: "right" })}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(sale.payments || []).map((p: any, i: number) => (
                  <tr key={i}>
                    <td style={tdStyle()}>{i + 1}</td>
                    <td style={tdStyle()}>{fmtDateTime(p.paidAt || p.date || new Date())}</td>
                    <td style={tdStyle()}>{p.method || p.type || ""}</td>
                    <td style={tdStyle()}>{p.reference || ""}</td>
                    <td style={tdStyle({ textAlign: "right" })}>{fmt(Number(p.amount))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={tdStyle({ fontWeight: 700 })}>Total</td>
                  <td style={tdStyle({ textAlign: "right", fontWeight: 700 })}>{fmt(paidAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p style={{ fontSize: 10, color: "#555", margin: "4px 0" }}>VAT and TAX not included if not mentioned in the item field.</p>

        {/* Terms */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>Terms &amp; Conditions:</div>
          <ol style={{ paddingLeft: 16 }}>
            {[
              "Goods once sold will not be refunded & exchanged without valid reason.",
              "Products under warranty will be repaired or replaced per manufacturer policy.",
              "Warranty timing is controlled by the manufacturing company.",
              "Warranty does not cover: physical damage, liquid spillage, removed stickers, software/data, or accessories.",
              "Please retain this invoice for all warranty claims.",
            ].map((t, i) => (
              <li key={i} style={{ fontSize: 10, color: "#444", lineHeight: 1.5, marginBottom: 2 }}>{t}</li>
            ))}
          </ol>
        </div>

        {/* Signature — Issued By only */}
        <div style={{ marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
          <div style={{ display: "inline-block", textAlign: "center", minWidth: 200 }}>
            <div style={{ height: 48 }} />
            <div style={{ borderTop: "1px dotted #9ca3af", paddingTop: 4, fontSize: 10 }}>Issued By</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>Enter Computers</div>
            <div style={{ marginTop: 6, fontSize: 10, color: "#6b7280" }}>Date: _______________</div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 9, color: "#9ca3af", marginTop: 12 }}>
          This is a system generated invoice — seal &amp; sign are not mandatory.
        </div>
      </div>

      {/* ── Buttons ─────────────────────────────────────────── */}
      <div className="mt-5 flex justify-center gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Close
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Download PDF
        </button>
      </div>
    </Modal>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────
function thStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    border: "1px solid #9ca3af", padding: "4px 8px", fontSize: 11,
    background: "#f3f4f6", fontWeight: 700, textAlign: "left", ...extra,
  };
}
function tdStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return { border: "1px solid #9ca3af", padding: "4px 8px", fontSize: 11, ...extra };
}

// ── Trigger button ────────────────────────────────────────────────────────
export function PrintInvoiceButton({
  sale: initialSale,
  variant = "icon",
  className = "",
}: {
  sale: Sale;
  variant?: "icon" | "button";
  className?: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [fullSale, setFullSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Sale>(`/api/sales/${initialSale.id}`);
      setFullSale(data);
    } catch {
      setFullSale(initialSale); // fallback
    } finally {
      setLoading(false);
      setShowModal(true);
    }
  };

  const saleToShow = fullSale || initialSale;

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={handleOpen}
          disabled={loading}
          className={`rounded-lg p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 disabled:opacity-50 ${className}`}
          title="Print Invoice"
        >
          {loading ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          )}
        </button>
        {showModal && (
          <InvoicePrintModal sale={saleToShow} isOpen={showModal} onClose={() => { setShowModal(false); setFullSale(null); }} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-70 ${className}`}
      >
        {loading ? (
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        )}
        {loading ? "Loading..." : "Print Invoice"}
      </button>
      {showModal && (
        <InvoicePrintModal sale={saleToShow} isOpen={showModal} onClose={() => { setShowModal(false); setFullSale(null); }} />
      )}
    </>
  );
}
