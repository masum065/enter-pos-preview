"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";

interface Purchase {
  id: string;
  invoiceNumber: string;
  purchaseDate: string;
  sellerName: string;
  sellerPhone: string;
  productName: string;
  serialNumber: string;
  imei?: string;
  purchasePrice: string | number;
  paidAmount: string | number;
  paymentMethod: string;
  notes?: string;
  createdByName?: string;
  [key: string]: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(n: number | string): string {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string | Date): string {
  const date = new Date(d);
  const dd  = String(date.getDate()).padStart(2, "0");
  const mon = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][date.getMonth()];
  return `${dd}-${mon}-${String(date.getFullYear()).slice(-2)}`;
}

// ── Build printable HTML ──────────────────────────────────────────────────
function buildPurchaseHTML(p: Purchase): string {
  const price   = Number(p.purchasePrice);
  const paid    = Number(p.paidAmount);
  const balance = price - paid;
  const isPaid  = balance <= 0;
  const cols    = p.imei ? 4 : 3; // SL + PRODUCT + SERIAL [+ IMEI] + PRICE

  const statusText = isPaid ? "Paid" : balance < price ? "Partial" : "Unpaid";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Purchase — ${p.invoiceNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1a1a1a;background:#fff;padding:24px 28px;}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
  .logo{font-size:26px;font-weight:900;font-style:italic;letter-spacing:-0.5px;}
  .shop-name{font-weight:700;font-size:11px;margin-top:4px;}
  .shop-addr{font-size:10px;color:#555;max-width:300px;line-height:1.4;margin-top:2px;}
  .inv-box{border:1px solid #9ca3af;font-size:11px;min-width:180px;}
  .inv-box-title{text-align:center;font-weight:700;border-bottom:1px solid #9ca3af;padding:4px 16px;}
  .inv-box-row{padding:4px 16px;border-bottom:1px solid #e5e7eb;}
  .inv-box-row:last-child{border-bottom:none;}
  .row{display:flex;flex-wrap:wrap;gap:0 20px;margin-bottom:3px;font-size:11px;}
  table{width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #9ca3af;}
  th,td{border:1px solid #9ca3af;padding:4px 8px;font-size:11px;word-break:break-word;}
  thead th{background:#f3f4f6;font-weight:700;}
  .tr{text-align:right;}.tc{text-align:center;}.at{vertical-align:top;}
  .mono{font-family:monospace;}.fw7{font-weight:700;}.fw6{font-weight:600;}
  .note{font-size:10px;color:#555;margin:4px 0;}
  .status-badge{display:inline-block;border:1px solid #1a1a1a;border-radius:3px;padding:1px 6px;font-size:10px;font-weight:700;color:#1a1a1a;}
  .sig-section{margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;display:flex;justify-content:flex-end;}
  .sig-box{text-align:center;min-width:200px;}
  .footer-note{text-align:center;font-size:9px;color:#9ca3af;margin-top:20px;padding-top:12px;border-top:1px solid #f3f4f6;}
  @media print{@page{size:A4;margin:12mm 14mm;}body{padding:0!important;}}
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
      <div class="inv-box-title">Purchase Voucher</div>
      <div class="inv-box-row">NO: <strong>${p.invoiceNumber}</strong></div>
      <div class="inv-box-row">Date: ${fmtDate(p.purchaseDate)}</div>
    </div>
  </div>

  <div style="padding-top:8px;margin-bottom:8px;">
    <div class="row">
      <span><strong>Seller:</strong> ${p.sellerName}</span>
      <span><strong>Phone:</strong> ${p.sellerPhone}</span>
    </div>
    <div class="row">
      <span><strong>Prepared By:</strong> ${p.createdByName || 'Admin'}</span>
      <span><strong>Payment:</strong> ${p.paymentMethod}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:28px">SL.</th>
        <th>PRODUCT</th>
        <th class="mono" style="width:120px">SERIAL NO.</th>
        ${p.imei ? '<th class="mono" style="width:110px">IMEI</th>' : ''}
        <th class="tr" style="width:110px">PURCHASE PRICE</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="at">1</td>
        <td class="at">${p.productName}</td>
        <td class="at mono">${p.serialNumber}</td>
        ${p.imei ? `<td class="at mono">${p.imei}</td>` : ''}
        <td class="at tr fw6">${fmt(price)}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td colspan="${cols - 1}" style="font-size:11px;">
          <strong>Payment Status:</strong>
          <span class="status-badge">${statusText}</span>
          &nbsp; <strong>Method:</strong> ${p.paymentMethod}
        </td>
        <td class="tr fw6">Purchase Price</td>
        <td class="tr fw6">${fmt(price)}</td>
      </tr>
      <tr>
        <td colspan="${cols - 1}"></td>
        <td class="tr fw6">Paid to Seller</td>
        <td class="tr fw6">${fmt(paid)}</td>
      </tr>
      ${balance > 0 ? `
      <tr>
        <td colspan="${cols - 1}"></td>
        <td class="tr fw7">Balance Due</td>
        <td class="tr fw7">${fmt(balance)}</td>
      </tr>` : ''}
    </tfoot>
  </table>

  ${p.notes ? `<p class="note" style="margin-top:6px;"><strong>Notes:</strong> ${p.notes}</p>` : ''}

  <div class="sig-section">
    <div class="sig-box">
      <div style="height:48px;"></div>
      <div style="border-top:1px dotted #9ca3af;padding-top:4px;font-size:10px;">Issued By</div>
      <div style="font-size:10px;color:#555;margin-top:2px;">Enter Computers</div>
    </div>
  </div>

  <div class="footer-note">This is a system generated purchase voucher.</div>

  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body>
</html>`;
}

// ── Style helpers ─────────────────────────────────────────────────────────
function th(extra: React.CSSProperties = {}): React.CSSProperties {
  return { border: "1px solid #9ca3af", padding: "4px 8px", fontSize: 11, background: "#f3f4f6", fontWeight: 700, textAlign: "left", ...extra };
}
function td(extra: React.CSSProperties = {}): React.CSSProperties {
  return { border: "1px solid #9ca3af", padding: "4px 8px", fontSize: 11, wordBreak: "break-word", ...extra };
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function PurchasePrintModal({
  purchase,
  isOpen,
  onClose,
}: {
  purchase: Purchase;
  isOpen: boolean;
  onClose: () => void;
}) {
  const price   = Number(purchase.purchasePrice);
  const paid    = Number(purchase.paidAmount);
  const balance = price - paid;
  const isPaid  = balance <= 0;
  const cols    = purchase.imei ? 4 : 3;
  const statusText = isPaid ? "Paid" : balance < price ? "Partial" : "Unpaid";

  const handlePrint = () => {
    const html = buildPurchaseHTML(purchase);
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Please allow pop-ups to print"); return; }
    w.document.write(html);
    w.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Purchase Voucher Preview" size="lg">
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
              Dhaka, Bangladesh<br />Phone: +880 1234-567890 | info@entercomputers.com
            </div>
          </div>
          <div style={{ border: "1px solid #9ca3af", fontSize: 11, minWidth: 180 }}>
            <div style={{ textAlign: "center", fontWeight: 700, borderBottom: "1px solid #9ca3af", padding: "4px 16px" }}>Purchase Voucher</div>
            <div style={{ padding: "4px 16px", borderBottom: "1px solid #e5e7eb" }}>NO: <strong>{purchase.invoiceNumber}</strong></div>
            <div style={{ padding: "4px 16px" }}>Date: {fmtDate(purchase.purchaseDate)}</div>
          </div>
        </div>

        {/* Seller — no hr, top padding */}
        <div style={{ paddingTop: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 20px", marginBottom: 3 }}>
            <span><strong>Seller:</strong> {purchase.sellerName}</span>
            <span><strong>Phone:</strong> {purchase.sellerPhone}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 20px" }}>
            <span><strong>Prepared By:</strong> {purchase.createdByName || "Admin"}</span>
            <span><strong>Payment:</strong> {purchase.paymentMethod}</span>
          </div>
        </div>

        {/* Product table — table-layout fixed, border stable */}
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={th({ width: 28 })}>SL.</th>
              <th style={th()}>PRODUCT</th>
              <th style={th({ width: 120, fontFamily: "monospace" })}>SERIAL NO.</th>
              {purchase.imei && <th style={th({ width: 110, fontFamily: "monospace" })}>IMEI</th>}
              <th style={th({ width: 110, textAlign: "right" })}>PURCHASE PRICE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={td({ verticalAlign: "top" })}>1</td>
              <td style={td({ verticalAlign: "top" })}>{purchase.productName}</td>
              <td style={td({ verticalAlign: "top", fontFamily: "monospace" })}>{purchase.serialNumber}</td>
              {purchase.imei && <td style={td({ verticalAlign: "top", fontFamily: "monospace" })}>{purchase.imei}</td>}
              <td style={td({ verticalAlign: "top", textAlign: "right", fontWeight: 600 })}>{fmt(price)}</td>
            </tr>
          </tbody>
          <tfoot>
            {/* Payment status inside table — left side, Purchase Price right */}
            <tr>
              <td colSpan={cols - 1} style={td({ fontSize: 11 })}>
                <strong>Payment Status:</strong>{" "}
                <span style={{ display: "inline-block", border: "1px solid #1a1a1a", borderRadius: 3, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                  {statusText}
                </span>
                &nbsp;&nbsp;<strong>Method:</strong> {purchase.paymentMethod}
              </td>
              <td style={td({ textAlign: "right", fontWeight: 600 })}>Purchase Price</td>
              <td style={td({ textAlign: "right", fontWeight: 600 })}>{fmt(price)}</td>
            </tr>
            <tr>
              <td colSpan={cols - 1}></td>
              <td style={td({ textAlign: "right", fontWeight: 600 })}>Paid to Seller</td>
              <td style={td({ textAlign: "right", fontWeight: 600 })}>{fmt(paid)}</td>
            </tr>
            {balance > 0 && (
              <tr>
                <td colSpan={cols - 1}></td>
                <td style={td({ textAlign: "right", fontWeight: 700 })}>Balance Due</td>
                <td style={td({ textAlign: "right", fontWeight: 700 })}>{fmt(balance)}</td>
              </tr>
            )}
          </tfoot>
        </table>

        {purchase.notes && (
          <p style={{ fontSize: 10, color: "#555", margin: "6px 0" }}><strong>Notes:</strong> {purchase.notes}</p>
        )}

        {/* Signature — right aligned, no date */}
        <div style={{ marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ textAlign: "center", minWidth: 200 }}>
            <div style={{ height: 48 }} />
            <div style={{ borderTop: "1px dotted #9ca3af", paddingTop: 4, fontSize: 10 }}>Issued By</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>Enter Computers</div>
          </div>
        </div>

        {/* Footer note — very bottom */}
        <div style={{ textAlign: "center", fontSize: 9, color: "#9ca3af", marginTop: 20, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
          This is a system generated purchase voucher.
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-5 flex justify-center gap-3">
        <button onClick={onClose}
          className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
          Close
        </button>
        <button onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 font-medium text-white hover:bg-purple-700">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Download PDF
        </button>
      </div>
    </Modal>
  );
}

// ── Trigger button ────────────────────────────────────────────────────────
export function PrintPurchaseButton({
  purchase: initialPurchase,
  className = "",
}: {
  purchase: Purchase;
  className?: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [fullPurchase, setFullPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchases/${initialPurchase.id}`);
      if (res.ok) {
        const data = await res.json();
        setFullPurchase(data);
      } else {
        setFullPurchase(initialPurchase);
      }
    } catch {
      setFullPurchase(initialPurchase);
    } finally {
      setLoading(false);
      setShowModal(true);
    }
  };

  const purchaseToShow = fullPurchase || initialPurchase;

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className={`rounded-lg p-2 text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-purple-900/30 dark:hover:text-purple-400 disabled:opacity-50 ${className}`}
        title="Print Purchase Voucher"
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
        <PurchasePrintModal
          purchase={purchaseToShow}
          isOpen={showModal}
          onClose={() => { setShowModal(false); setFullPurchase(null); }}
        />
      )}
    </>
  );
}
