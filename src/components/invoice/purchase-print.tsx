"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useShopInfo } from "@/hooks/useShopInfo";
import type { ShopInfo } from "@/lib/shop-info";
import { DEFAULT_SHOP_INFO } from "@/lib/shop-info";

interface Purchase {
  id: string;
  invoiceNumber: string;
  purchaseDate: string;
  sellerName: string;
  sellerPhone: string;
  sellerAddress?: string;
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
function amountInWords(amount: number): string {
  const whole = Math.floor(amount);
  const paise = Math.round((amount - whole) * 100);
  let result = "BDT " + numberToWords(whole);
  if (paise > 0) result += " and " + numberToWords(paise) + " Paisa";
  return result + " Only";
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

// ── Build printable HTML ──────────────────────────────────────────────────
function buildPurchaseHTML(p: Purchase, forPreview = false, shopInfo: ShopInfo = DEFAULT_SHOP_INFO): string {
  const s = shopInfo; // short alias
  const price   = Number(p.purchasePrice);
  const paid    = Number(p.paidAmount);
  const balance = price - paid;
  const isPaid  = balance <= 0;
  
  // Create item row
  const itemRow = `
    <tr>
      <td style="text-align:center;">1</td>
      <td style="padding-left:12px;">${p.productName || ""}</td>
      <td style="text-align:center;">N/A</td>
      <td style="text-align:center;" class="mono">${p.serialNumber || ""}${p.imei ? '<br/>' + p.imei : ''}</td>
      <td style="text-align:center;">1</td>
      <td style="text-align:right;">${fmt(price)}</td>
      <td style="text-align:right;">${fmt(price)}</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Purchase Voucher ${p.invoiceNumber}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{
    font-family:'Inter','Noto Sans Bengali',sans-serif;
    font-size:13px;color:#1a1a1a;
    background:${forPreview ? '#fff' : '#e5e7eb'};
    ${forPreview ? '' : 'padding:20px;'}
  }
  .bn{font-family:'Noto Sans Bengali','Inter',sans-serif;}
  .page{
    background:#fff;
    ${forPreview ? '' : 'max-width:210mm; margin:0 auto; box-shadow:0 2px 16px rgba(0,0,0,.12);'}
    min-height:297mm;
    display:flex;flex-direction:column;
  }
  .content{flex:1;padding:36px 32px 0;}

  /* ── Header ── */
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid #ccc;}
  .hdr-left{display:flex;flex-direction:column;gap:4px; align-items: self-start;}
  .hdr-left img{height:60px;object-fit:contain;}
  .hdr-left .tagline{font-size:11px;color:#555;margin-top:2px;}
  .hdr-right{text-align:right;}
  .hdr-right .phones{font-size:17px;font-weight:800;color:#1a1a1a;letter-spacing:0.3px;}
  .hdr-right .addr{font-size:11.5px;color:#555;margin-top:3px;line-height:1.5; max-width:70%; margin-left: auto;}

  /* ── Title row ── */
  .title-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ccc;}
  .title-row .bill-title{flex:1;text-align:center;font-size:16px;font-weight:700;font-style:italic;}
  .title-row .inv-no{font-size:13px;font-weight:600;white-space:nowrap;border:1px solid #aaa;padding:3px 12px;}

  /* ── Customer row (adapted for Seller) ── */
  .cust-row{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #ccc;font-size:13px;line-height:1.8;}
  .cust-row .left span,.cust-row .right span{display:inline;}
  .cust-row .date-box{border:1px solid #9ca3af;padding:2px 14px;display:inline-block;margin-top:2px;}

  /* ── Tables ── */
  .tbl{width:100%;border-collapse:collapse;font-size:13px;}
  .tbl th,.tbl td{border:1px solid #9ca3af;padding:5px 8px;}
  .tbl thead th{background:#f3f4f6;font-weight:700;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;}
  .tbl .ac{text-align:center;} .tbl .ar{text-align:right;} .tbl .al{text-align:left;padding-left:12px;}
  .tbl .fw{font-weight:700;} .tbl .bg{background:#f9fafb;}
  .mono{font-family:'Inter',sans-serif;font-size:12px;font-weight:500;}

  /* ── Paid / Due ── */
  .paid-due{padding:6px 0;text-align:right;font-size:13.5px;font-weight:700;}

  /* ── Note ── */
  .note{padding:2px 0 8px;font-size:12px;color:#666;font-style:italic;}

  /* ── Bottom section  ── */
  .bottom-section{margin-top:auto;}

  /* ── T&C wrapper ── */
  .tnc-section{padding:0 32px 14px;}
  .tnc-wrapper{border:2px solid #222;position:relative;background:#fff;}
  .tnc-bar{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:#333;color:#fff;font-size:13px;font-weight:700;padding:4px 24px;white-space:nowrap;border-radius:3px;}
  .tnc-body{margin-top:22px;padding:8px 14px 4px;font-size:11.5px;line-height:1.75;color:#222;}
  .tnc-item{margin-bottom:5px;display:flex;gap:8px;align-items:flex-start;}
  .tnc-label{display:inline-block;background:#1a1a1a;color:#fff;font-weight:700;font-size:11px;padding:4px 12px;border-radius:6px;white-space:nowrap;flex-shrink:0;margin-top:1px;}
  .tnc-desc{flex:1;}
  .tnc-footer{background:#1a1a1a;color:#fff;font-size:12.5px;font-weight:700;text-align:center;padding:7px 16px;margin-top:8px;}

  /* ── Signature ── */
  .sigs{display:flex;justify-content:space-between;padding:30px 40px 20px;}
  .sig-line{border-top:1px solid #1a1a1a;padding-top:4px;font-weight:600;font-size:14px;text-align:center;width:180px;position:relative;}
  .cust-sig{margin-left:auto;}
  .auth-img{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);max-height:60px;max-width:160px;}

  /* ── Page Footer ── */
  .pg-footer{background:#2d2d2d;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:9px 28px;font-size:13px;}
  .pg-footer .fb-icon{background:#1877f2;color:#fff;font-weight:900;font-size:12px;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;border-radius:3px;margin-right:6px;}

  @media print{
    @page{size:A4;margin:0;}
    body{background:#fff;padding:0;}
    .page{box-shadow:none;}
    .pg-footer,.tnc-wrapper,.tnc-bar,.tnc-footer,.tnc-label,.tbl thead th{
      -webkit-print-color-adjust:exact;print-color-adjust:exact;
    }
  }
</style>
</head>
<body>
<div class="page">
<div class="content">

  <!-- HEADER -->
  <div class="hdr">
    <div class="hdr-left">
      <img src="${s.logo || '/enter-logo.png'}" alt="${s.shopName}"/>
     <!-- <span class="tagline bn">${s.tagline}</span> -->
    </div>
    <div class="hdr-right">
      <div class="phones">${s.phone1}${s.phone2 ? ' &nbsp; ' + s.phone2 : ''}</div>
      <div class="addr bn">${s.address.replace(/\n/g, '<br/>')}</div>
    </div>
  </div>

  <!-- TITLE ROW -->
  <div class="title-row">
    <div class="bill-title">Purchase Voucher</div>
    <div class="inv-no"><strong>${p.invoiceNumber}</strong></div>
  </div>

  <!-- CUSTOMER (Adapted for Seller) -->
  <div class="cust-row">
    <div class="left">
      <span><strong>Seller:</strong> ${p.sellerName} &nbsp;&nbsp; <strong>Phone:</strong> ${p.sellerPhone}</span><br/>
      ${p.sellerAddress ? `<span><strong>Address:</strong> ${p.sellerAddress}</span>` : ''}
    </div>
    <div class="right" style="text-align:right;">
      <span><strong>Prepared By:</strong> ${p.createdByName || 'Admin'}</span><br/>
      <div class="date-box">Date: ${fmtDate(p.purchaseDate)}</div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <div style="padding:14px 0 6px;">
    <table class="tbl">
      <thead>
        <tr>
          <th style="width:36px;">SL.</th>
          <th class="al">ITEM</th>
          <th style="width:72px;">WARRANTY</th>
          <th style="width:108px;">SERIAL NO.</th>
          <th style="width:40px;">QTY</th>
          <th style="width:95px;">PRICE</th>
          <th style="width:95px;">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${itemRow}
        <tr>
          <td colspan="5" rowspan="2" style="vertical-align:middle;padding:8px 10px;">
            <strong>Amount In Words:</strong> ${amountInWords(price)}
          </td>
          <td class="ar fw bg">Total</td>
          <td class="ar">${fmt(price)}</td>
        </tr>
        <tr>
          <td class="ar fw bg">Grand Total</td>
          <td class="ar fw">${fmt(price)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- PAID / DUE -->
  <div class="paid-due">
    Paid: ${fmt(paid)} Tk &nbsp;&nbsp; Due: ${fmt(balance > 0 ? balance : 0)} Tk
  </div>

  <!-- NOTE -->
  <div class="note">
    Payment Method: ${p.paymentMethod} &nbsp;|&nbsp; Status: ${isPaid ? "Paid" : balance < price ? "Partial" : "Unpaid"}<br>
    ${p.notes ? `Notes: ${p.notes}<br>` : ''}
    * Showing current page records. VAT and TAX not included if not mentioned above.
  </div>

  <!-- SIGNATURES -->
  <div class="sigs">
    <div class="sig-line">
      ${s.signature ? `<img src="${s.signature}" class="auth-img"/>` : ''}
      Authorized Signatory
    </div>
    <div class="sig-line cust-sig">Seller's Signature</div>
  </div>

</div><!-- .content -->

<div class="bottom-section">
<!-- TERMS & CONDITIONS -->
<div class="tnc-section">
  <div class="tnc-wrapper">
    <div class="tnc-bar bn">ক্রয় সম্পর্কিত শর্তাবলী (Purchase Terms &amp; Conditions)</div>
    <div class="tnc-body bn">
      ${(s.purchaseTermsAndConditions || []).map(tc => `<div class="tnc-item"><span class="tnc-label">${tc.label}</span><span class="tnc-desc">${tc.text}</span></div>`).join('')}
    </div>
    <div class="tnc-footer bn">${s.purchaseTermsFooter || "System Generated Purchase Voucher"}</div>
  </div>
</div>

<!-- PAGE FOOTER -->
<div class="pg-footer">
  <div style="display:flex;align-items:center;gap:6px;">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
    <span>${s.website}</span>
  </div>
  <div style="display:flex;align-items:center;gap:6px;">
    <span class="fb-icon">f</span>
    <span>${s.facebook}</span>
  </div>
</div>
</div><!-- .bottom-section -->

</div><!-- .page -->

</body>
</html>`;
  if (!forPreview) {
    const printScript = '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>';
    return html.replace('</body>', printScript + '</body>');
  }
  return html;
}

// ── Modal Component ───────────────────────────────────────────────────────
export function PurchasePrintModal({
  purchase,
  isOpen,
  onClose,
}: {
  purchase: Purchase;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: shopInfo } = useShopInfo();
  const info = shopInfo || DEFAULT_SHOP_INFO;

  const handlePrint = () => {
    const html = buildPurchaseHTML(purchase, false, info);
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Please allow pop-ups to print the voucher"); return; }
    w.document.write(html);
    w.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" showDivider={false}>
      <div className="flex items-center justify-between gap-3 mb-3 -mt-2">
        <h3 className="text-lg font-bold text-dark dark:text-white">Purchase Voucher Preview</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 p-2 sm:p-3 rounded-lg">
        <iframe
          srcDoc={buildPurchaseHTML(purchase, true, info)}
          className="w-full border-0 bg-white rounded shadow-sm"
          style={{ height: '72vh', minHeight: 520 }}
        />
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

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
