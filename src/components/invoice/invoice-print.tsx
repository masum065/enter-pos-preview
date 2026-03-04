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
      <td class="at tr">${fmt(item.salePrice || item.price || 0)} ৳</td>
      <td class="at tr">${fmt(item.amount || item.total || 0)} ৳</td>
    </tr>`).join("");

  const payRows = (sale.payments || []).map((p: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td>${fmtDateTime(p.paidAt || p.date || new Date())}</td>
      <td>${p.method || p.type || ""}</td>
      <td>${p.reference || ""}</td>
      <td class="tr">${fmt(Number(p.amount))} ৳</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${sale.invoiceNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#1a1a1a;background:#fff;padding:24px 28px;}

  /* Header */
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-bottom:12px;border-bottom:2px solid #FF6600;}
  .hdr-logo img{height:50px;}
  .hdr-right{text-align:right;}
  .hdr-right .shop-title{font-size:16px;font-weight:800;color:#FF6600;margin-bottom:2px;}
  .hdr-right .shop-addr-bn{font-size:9.5px;color:#333;line-height:1.4;}
  .hdr-right .shop-contact{font-size:9px;color:#555;margin-top:2px;line-height:1.3;}

  /* Bill banner */
  .bill-banner{background:linear-gradient(135deg,#FF6600,#FF8833);color:#fff;text-align:center;font-size:13px;font-weight:700;font-style:italic;padding:6px 0;margin-bottom:10px;border-radius:3px;letter-spacing:0.5px;}

  /* Customer / Invoice details */
  .cust-inv-row{display:flex;justify-content:space-between;margin-bottom:10px;font-size:10px;}
  .cust-info{flex:1;}
  .cust-info .label{font-weight:700;color:#FF6600;font-size:10px;margin-bottom:3px;}
  .cust-info div{margin-bottom:1px;}
  .inv-details{text-align:right;}
  .inv-details .label{font-weight:700;color:#FF6600;font-size:10px;margin-bottom:3px;}
  .inv-details div{margin-bottom:1px;}

  /* Tables */
  table{width:100%;border-collapse:collapse;margin-bottom:8px;}
  th,td{border:1px solid #ddd;padding:4px 8px;font-size:10px;word-break:break-word;}
  thead th{background:#f7941d;color:#fff;font-weight:700;text-transform:uppercase;font-size:10px;}
  .tr{text-align:right;} .tc{text-align:center;} .at{vertical-align:top;}
  .mono{font-family:monospace;} .fw7{font-weight:700;} .fw6{font-weight:600;}
  tfoot td{background:#FFF5EB;font-weight:600;}
  tfoot tr:last-child td{background:#FFF0E0;font-weight:700;font-size:10px;}

  /* Section headers */
  .section-header{background:linear-gradient(135deg,#FF6600,#FF8833);color:#fff;font-weight:700;font-size:10px;padding:4px 10px;border-radius:2px;}
  .section-header-dark{background:#333;color:#fff;font-weight:700;font-size:10px;padding:4px 10px;border-radius:2px;}

  /* Amounts summary */
  .amounts-wrap{display:flex;gap:0;margin-bottom:10px;}
  .amounts-left{flex:1;border:1px solid #ddd;border-right:none;}
  .amounts-right{width:280px;border:1px solid #ddd;}
  .amounts-left .section-header,.amounts-right .section-header{margin-top:0;border-radius:0;}
  .amounts-row{display:flex;justify-content:space-between;padding:4px 10px;border-bottom:1px solid #eee;font-size:10px;}
  .amounts-row:last-child{border-bottom:none;}
  .amounts-row.total{font-weight:700;font-size:10px;background:#FFF5EB;}
  .amounts-row.due{color:#dc2626;font-weight:700;}

  .note{font-size:9px;color:#555;margin:3px 0;}

  /* Signature */
  .signature-area{margin-top:24px;display:flex;justify-content:flex-end;}
  .signature-block{text-align:center;min-width:220px;}
  .signature-block img{height:50px;margin-bottom:3px;}
  .signature-block .sig-label{font-size:10px;font-weight:700;color:#FF6600;border-top:1px solid #FF6600;padding-top:3px;}

  .footer-note{text-align:center;font-size:8px;color:#9ca3af;margin-top:12px;padding-top:8px;border-top:1px solid #f3f4f6;}

  @media print{
    @page{size:A4;margin:12mm 14mm;}
    body{padding:0!important;}
    .bill-banner,.section-header,.section-header-dark,thead th{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    tfoot td{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  }
</style>
</head>
<body>
  <!-- Header -->
  <div class="hdr">
    <div class="hdr-logo">
      <img src="/enter-logo.png" alt="Enter Computers"/>
    </div>
    <div class="hdr-right">
      <div class="shop-title">Enter Computer's</div>
      <div class="shop-addr-bn">
        অলকা নদী বাংলা কমপ্লেক্স, ২য় তলা, দোকান নং - ২৩৮ - রামবাবু রোড,<br>
        গাংগিনারপার, সদর, ময়মনসিংহ।
      </div>
      <div class="shop-contact">
        Phone no.: 01684-134574, 01789-443043 Email:<br>
        entercomputersmym@gmail.com
      </div>
    </div>
  </div>

  <!-- Bill of Supply Banner -->
  <div class="bill-banner">Bill of Supply</div>

  <!-- Customer + Invoice Details -->
  <div class="cust-inv-row">
    <div class="cust-info">
      <div class="label">Bill To</div>
      <div><strong>${sale.customerName}</strong></div>
      <div>${(sale as any).customerAddress || ''}</div>
      <div>Contact No. : ${sale.customerPhone}</div>
    </div>
    <div class="inv-details">
      <div class="label">Invoice Details</div>
      <div>Invoice No. : <strong>${sale.invoiceNumber}</strong></div>
      <div>Date : ${fmtDate(sale.invoiceDate)}</div>
    </div>
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th style="width:28px">#</th>
        <th>Item name</th>
        <th class="mono" style="width:120px">Serial No.</th>
        <th class="tc" style="width:40px">Qty</th>
        <th class="tr" style="width:80px">Price/ Unit</th>
        <th class="tr" style="width:80px">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3"></td>
        <td class="fw7">Total</td>
        <td class="tr"></td>
        <td class="tr fw7">${fmt(subtotal)} ৳</td>
      </tr>
      ${discount > 0 ? `<tr>
        <td colspan="3"></td>
        <td class="fw6">Discount</td>
        <td class="tr"></td>
        <td class="tr fw6">(${fmt(discount)}) ৳</td>
      </tr>` : ""}
    </tfoot>
  </table>

  <!-- Amounts Summary -->
  <div class="amounts-wrap">
    <div class="amounts-left">
      <div class="section-header">Invoice Amount In Words</div>
      <div style="padding:8px 12px;font-size:11px;">${amountInWords(grandTotal)}</div>
      <div class="section-header-dark">Terms and Conditions</div>
      <div style="padding:6px 12px;">
        <div style="font-size:10px;color:#444;line-height:1.6;">
          * 7 Day's Replacement Guarantee with 365 day's Service Warranty (Without parts).<br>
          * To apply for the warranty, the warranty sticker and serial number must be kept intact.<br>
          * Warranty is not applicable for any external or electrical damage.
        </div>
      </div>
    </div>
    <div class="amounts-right">
      <div class="section-header">Amounts</div>
      <div class="amounts-row">
        <span>Sub Total</span>
        <span>${fmt(subtotal)} ৳</span>
      </div>
      ${discount > 0 ? `<div class="amounts-row"><span>Discount</span><span>(${fmt(discount)}) ৳</span></div>` : ""}
      <div class="amounts-row total">
        <span>Total</span>
        <span>${fmt(grandTotal)} ৳</span>
      </div>
      <div class="amounts-row">
        <span>Received</span>
        <span>${fmt(paidAmount)} ৳</span>
      </div>
      ${dueAmount > 0 ? `<div class="amounts-row due"><span>Balance</span><span>${fmt(dueAmount)} ৳</span></div>` : ""}
    </div>
  </div>

  ${sale.payments?.length > 0 ? `
  <div style="margin-top:10px;margin-bottom:10px;">
    <div class="section-header" style="margin-bottom:6px;">Payment History</div>
    <table>
      <thead><tr><th style="width:36px">SL.</th><th>Date</th><th style="width:80px">Method</th><th>Reference</th><th class="tr" style="width:90px">Amount</th></tr></thead>
      <tbody>${payRows}</tbody>
      <tfoot><tr><td colspan="4" class="fw7">Total</td><td class="tr fw7">${fmt(paidAmount)} ৳</td></tr></tfoot>
    </table>
  </div>` : ""}

  <!-- Signature -->
  <div class="signature-area">
    <div class="signature-block">
      <img src="/entersign.png" alt="Authorized Signature"/>
      <div class="sig-label">Authorized Signatory</div>
    </div>
  </div>

  <div class="footer-note">This is a computer generated invoice.</div>

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
        style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 10, color: "#1a1a1a" }}
        className="max-h-[65vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 text-left dark:border-gray-700 dark:bg-white"
      >
       {/* Header — logo left, shop info right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, paddingBottom: 12, borderBottom: "2px solid #FF6600" }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/enter-logo.png" alt="Enter Computers" style={{ height: 45 }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#FF6600", marginBottom: 2 }}>Enter Computer&apos;s</div>
            <div style={{ fontSize: 9, color: "#333", lineHeight: 1.4 }}>
              অলকা নদী বাংলা কমপ্লেক্স, ২য় তলা, দোকান নং - ২৩৮ - রামবাবু রোড,<br />
              গাংগিনারপার, সদর, ময়মনসিংহ।
            </div>
            <div style={{ fontSize: 8, color: "#555", marginTop: 2, lineHeight: 1.3 }}>
              Phone no.: 01684-134574, 01789-443043 Email:<br />
              entercomputersmym@gmail.com
            </div>
          </div>
        </div>

        {/* Bill of Supply Banner */}
        <div style={{ background: "linear-gradient(135deg, #FF6600, #FF8833)", color: "#fff", textAlign: "center", fontSize: 13, fontWeight: 700, fontStyle: "italic", padding: "5px 0", marginBottom: 10, borderRadius: 3, letterSpacing: 0.5 }}>
          Bill of Supply
        </div>

        {/* Customer + Invoice Details Row */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#FF6600", fontSize: 10, marginBottom: 3 }}>Bill To</div>
            <div><strong>{sale.customerName}</strong></div>
            {(sale as any).customerAddress && <div>{(sale as any).customerAddress}</div>}
            <div>Contact No. : {sale.customerPhone}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, color: "#FF6600", fontSize: 10, marginBottom: 3 }}>Invoice Details</div>
            <div>Invoice No. : <strong>{sale.invoiceNumber}</strong></div>
            <div>Date : {fmtDate(sale.invoiceDate)}</div>
          </div>
        </div>

        {/* Items */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
          <thead>
            <tr>
              <th style={thStyle({ width: 28 })}>#</th>
              <th style={thStyle()}>Item name</th>
              <th style={thStyle({ width: 110, fontFamily: "monospace" })}>Serial No.</th>
              <th style={thStyle({ width: 40, textAlign: "center" })}>Qty</th>
              <th style={thStyle({ width: 80, textAlign: "right" })}>Price/ Unit</th>
              <th style={thStyle({ width: 80, textAlign: "right" })}>Amount</th>
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
                <td style={tdStyle({ verticalAlign: "top", textAlign: "right" })}>{fmt(item.salePrice || item.price || 0)} ৳</td>
                <td style={tdStyle({ verticalAlign: "top", textAlign: "right" })}>{fmt(item.amount || item.total || 0)} ৳</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={tdStyle({ background: "#FFF5EB" })}></td>
              <td style={tdStyle({ fontWeight: 700, background: "#FFF5EB" })}>Total</td>
              <td style={tdStyle({ textAlign: "right", background: "#FFF5EB" })}></td>
              <td style={tdStyle({ textAlign: "right", fontWeight: 700, background: "#FFF5EB" })}>{fmt(subtotal)} ৳</td>
            </tr>
            {discount > 0 && (
              <tr>
                <td colSpan={3} style={tdStyle({ background: "#FFF5EB" })}></td>
                <td style={tdStyle({ fontWeight: 600, background: "#FFF5EB" })}>Discount</td>
                <td style={tdStyle({ textAlign: "right", background: "#FFF5EB" })}></td>
                <td style={tdStyle({ textAlign: "right", fontWeight: 600, background: "#FFF5EB" })}>({fmt(discount)}) ৳</td>
              </tr>
            )}
          </tfoot>
        </table>

        {/* Amounts Summary — side by side */}
        <div style={{ display: "flex", marginBottom: 10 }}>
          {/* Left — words + terms */}
          <div style={{ flex: 1, border: "1px solid #ddd", borderRight: "none" }}>
            <div style={{ background: "linear-gradient(135deg, #FF6600, #FF8833)", color: "#fff", fontWeight: 700, fontSize: 10, padding: "4px 10px" }}>Invoice Amount In Words</div>
            <div style={{ padding: "6px 10px", fontSize: 10 }}>{amountInWords(grandTotal)}</div>
            <div style={{ background: "#333", color: "#fff", fontWeight: 700, fontSize: 10, padding: "4px 10px" }}>Terms and Conditions</div>
            <div style={{ padding: "5px 10px", fontSize: 9, color: "#444", lineHeight: 1.5 }}>
              * 7 Day&apos;s Replacement Guarantee with 365 day&apos;s Service Warranty (Without parts).<br />
              * To apply for the warranty, the warranty sticker and serial number must be kept intact.<br />
              * Warranty is not applicable for any external or electrical damage.
            </div>
          </div>
          {/* Right — amounts */}
          <div style={{ width: 240, border: "1px solid #ddd" }}>
            <div style={{ background: "linear-gradient(135deg, #FF6600, #FF8833)", color: "#fff", fontWeight: 700, fontSize: 10, padding: "4px 10px" }}>Amounts</div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #eee", fontSize: 10 }}>
              <span>Sub Total</span><span>{fmt(subtotal)} ৳</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #eee", fontSize: 10 }}>
                <span>Discount</span><span>({fmt(discount)}) ৳</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #eee", fontSize: 10, fontWeight: 700, background: "#FFF5EB" }}>
              <span>Total</span><span>{fmt(grandTotal)} ৳</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #eee", fontSize: 10 }}>
              <span>Received</span><span>{fmt(paidAmount)} ৳</span>
            </div>
            {dueAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 10px", fontSize: 10, fontWeight: 700, color: "#dc2626" }}>
                <span>Balance</span><span>{fmt(dueAmount)} ৳</span>
              </div>
            )}
          </div>
        </div>

        {/* Payments */}
        {(sale.payments || []).length > 0 && (
          <div style={{ marginTop: 10, marginBottom: 10 }}>
            <div style={{ background: "linear-gradient(135deg, #FF6600, #FF8833)", color: "#fff", fontWeight: 700, fontSize: 10, padding: "4px 10px", borderRadius: 2, marginBottom: 5 }}>Payment History</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle({ width: 36 })}>SL.</th>
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
                    <td style={tdStyle({ textAlign: "right" })}>{fmt(Number(p.amount))} ৳</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={tdStyle({ fontWeight: 700, background: "#FFF5EB" })}>Total</td>
                  <td style={tdStyle({ textAlign: "right", fontWeight: 700, background: "#FFF5EB" })}>{fmt(paidAmount)} ৳</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Signature */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ textAlign: "center", minWidth: 200 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/entersign.png" alt="Authorized Signature" style={{ height: 45, marginBottom: 3 }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: "#FF6600", borderTop: "1px solid #FF6600", paddingTop: 3 }}>Authorized Signatory</div>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: "center", fontSize: 8, color: "#9ca3af", marginTop: 12, paddingTop: 8, borderTop: "1px solid #f3f4f6" }}>
          This is a computer generated invoice.
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
          className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 font-medium text-white hover:opacity-90" style={{ background: "#FF6600" }}
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
    border: "1px solid #ddd", padding: "4px 8px", fontSize: 10,
    background: "#f7941d", color: "#fff", fontWeight: 700, textAlign: "left", textTransform: "uppercase" as const, ...extra,
  };
}
function tdStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return { border: "1px solid #ddd", padding: "4px 8px", fontSize: 10, ...extra };
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
