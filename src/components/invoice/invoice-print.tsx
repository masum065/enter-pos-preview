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
function buildInvoiceHTML(sale: Sale, forPreview = false): string {
  const grandTotal = Number(sale.grandTotal);
  const paidAmount = Number(sale.paidAmount);
  const dueAmount  = Number(sale.dueAmount);
  const discount   = Number(sale.discountAmount);
  const subtotal   = (sale.items || []).reduce((s: number, i: any) => s + Number(i.amount || i.salePrice || 0), 0);

  const itemRows = (sale.items || []).map((item: any, i: number) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td style="padding-left:12px;">${item.productName || item.name || ""}</td>
      <td style="text-align:center;">${item.warranty || "N/A"}</td>
      <td style="text-align:center;" class="mono">${item.serialNumber || item.serial || ""}</td>
      <td style="text-align:center;">${item.quantity || item.qty || 1}</td>
      <td style="text-align:right;">${fmt(item.salePrice || item.price || 0)}</td>
      <td style="text-align:right;">${fmt(item.amount || item.total || 0)}</td>
    </tr>`).join("");

  const payRows = (sale.payments || []).map((p: any, i: number) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td style="text-align:center;">${fmtDateTime(p.paidAt || p.date || new Date())}</td>
      <td style="text-align:center;">${p.method || p.type || ""}</td>
      <td style="text-align:center;">${p.reference || ""}</td>
      <td style="text-align:right;">${fmt(Number(p.amount))}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Invoice ${sale.invoiceNumber}</title>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{
    font-family:'Hind Siliguri','Noto Sans Bengali',sans-serif;
    font-size:13px;color:#1a1a1a;
    background:${forPreview ? '#fff' : '#e5e7eb'};
    ${forPreview ? '' : 'padding:20px;'}
  }
  .bn{font-family:'Noto Sans Bengali','Hind Siliguri',sans-serif;}
  .page{
    background:#fff;
    ${forPreview ? '' : 'max-width:210mm; margin:0 auto; box-shadow:0 2px 16px rgba(0,0,0,.12);'}
    min-height:297mm;
    display:flex;flex-direction:column;
  }
  .content{flex:1;padding:36px 32px 0;}

  /* ── Header ── */
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid #ccc;}
  .hdr-left{display:flex;flex-direction:column;gap:4px;}
  .hdr-left img{height:48px;object-fit:contain;}
  .hdr-left .tagline{font-size:11px;color:#555;margin-top:2px;}
  .hdr-right{text-align:right;}
  .hdr-right .phones{font-size:19px;font-weight:800;color:#1a1a1a;letter-spacing:0.3px;}
  .hdr-right .addr{font-size:11.5px;color:#555;margin-top:3px;line-height:1.5;}

  /* ── Title row ── */
  .title-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ccc;}
  .title-row .bill-title{flex:1;text-align:center;font-size:16px;font-weight:700;font-style:italic;}
  .title-row .inv-no{font-size:13px;font-weight:600;white-space:nowrap;border:1px solid #aaa;padding:3px 12px;}

  /* ── Customer row ── */
  .cust-row{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #ccc;font-size:13px;line-height:1.8;}
  .cust-row .left span,.cust-row .right span{display:inline;}
  .cust-row .date-box{border:1px solid #9ca3af;padding:2px 14px;display:inline-block;margin-top:2px;}

  /* ── Tables ── */
  .tbl{width:100%;border-collapse:collapse;font-size:13px;}
  .tbl th,.tbl td{border:1px solid #9ca3af;padding:5px 8px;}
  .tbl thead th{background:#f3f4f6;font-weight:700;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;}
  .tbl .ac{text-align:center;} .tbl .ar{text-align:right;} .tbl .al{text-align:left;padding-left:12px;}
  .tbl .fw{font-weight:700;} .tbl .bg{background:#f9fafb;}
  .mono{font-family:'Courier New',monospace;font-size:12px;}

  /* ── Paid / Due ── */
  .paid-due{padding:6px 0;text-align:right;font-size:13.5px;font-weight:700;}

  /* ── Note ── */
  .note{padding:2px 0 8px;font-size:12px;color:#666;font-style:italic;}

  /* ── Bottom section (T&C + footer pinned to bottom) ── */
  .bottom-section{margin-top:auto;}

  /* ── T&C wrapper ── */
  .tnc-section{padding:0 32px;}
  .tnc-wrapper{border:2px solid #222;position:relative;background:#fff;}
  .tnc-bar{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:#333;color:#fff;font-size:13px;font-weight:700;padding:4px 24px;white-space:nowrap;border-radius:3px;}
  .tnc-body{margin-top:22px;padding:8px 14px 4px;font-size:11.5px;line-height:1.75;color:#222;}
  .tnc-item{margin-bottom:5px;display:flex;gap:8px;align-items:flex-start;}
  .tnc-label{display:inline-block;background:#1a1a1a;color:#fff;font-weight:700;font-size:11px;padding:4px 12px;border-radius:6px;white-space:nowrap;flex-shrink:0;margin-top:1px;}
  .tnc-desc{flex:1;}
  .tnc-footer{background:#1a1a1a;color:#fff;font-size:12.5px;font-weight:700;text-align:center;padding:7px 16px;margin-top:8px;}

  /* ── Page Footer ── */
  .pg-footer{background:#2d2d2d;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:9px 28px;font-size:13px;}
  .pg-footer .fb-icon{background:#1877f2;color:#fff;font-weight:900;font-size:12px;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;border-radius:3px;margin-right:6px;}

  @media print{
    @page{size:A4;margin:0;}
    body{background:#fff;padding:0;}
    .page{box-shadow:none;min-height:auto;}
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
      <img src="/enter-logo.png" alt="Enter Computers"/>
      <span class="tagline bn">বেস্ট কোয়ালিটির প্রজেক্ট ইউজড ল্যাপটপ &amp; মোবাইল এর বিশ্বস্ত প্রতিষ্ঠান</span>
    </div>
    <div class="hdr-right">
      <div class="phones">01789-443043 &nbsp; 01684-134574</div>
      <div class="addr bn">অলকা নদী বাংলা কমপ্লেক্স ২য় তলা দোকান নং ২৩৮<br/>রাম বাবু রোড, গাংগিনারপার, সদর, ময়মনসিংহ।</div>
    </div>
  </div>

  <!-- TITLE ROW -->
  <div class="title-row">
    <div class="bill-title">Bill of Supply</div>
    <div class="inv-no"><strong>${sale.invoiceNumber}</strong></div>
  </div>

  <!-- CUSTOMER -->
  <div class="cust-row">
    <div class="left">
      <span><strong>Customer:</strong> ${sale.customerName} &nbsp;&nbsp; <strong>Phone:</strong> ${sale.customerPhone}</span><br/>
      ${(sale as any).customerAddress ? `<span><strong>Address:</strong> ${(sale as any).customerAddress}</span>` : ''}
    </div>
    <div class="right" style="text-align:right;">
      <span><strong>Salesman:</strong> System Administrator</span><br/>
      <div class="date-box">Date: ${fmtDate(sale.invoiceDate)}</div>
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
        ${itemRows}
        <tr>
          <td colspan="5" rowspan="${discount > 0 ? 3 : 2}" style="vertical-align:middle;padding:8px 10px;">
            <strong>Amount In Words:</strong> ${amountInWords(grandTotal)}
          </td>
          <td class="ar fw bg">Total</td>
          <td class="ar">${fmt(subtotal)}</td>
        </tr>
        ${discount > 0 ? `<tr>
          <td class="ar fw bg">Discount</td>
          <td class="ar">(${fmt(discount)})</td>
        </tr>` : ''}
        <tr>
          <td class="ar fw bg">Grand Total</td>
          <td class="ar fw">${fmt(grandTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- PAID / DUE -->
  <div class="paid-due">
    Paid: ${fmt(paidAmount)} Tk &nbsp;&nbsp; Due: ${fmt(dueAmount)} Tk
  </div>

  <!-- NOTE -->
  <div class="note">
    Good received by customer in good condition.
  </div>

  <!-- PAYMENT HISTORY -->
  ${sale.payments?.length > 0 ? `
  <div style="padding:4px 0 20px;">
    <p style="font-size:13px;font-weight:700;margin-bottom:6px;">Payment History</p>
    <table class="tbl">
      <thead>
        <tr>
          <th style="width:36px;">Sl.</th>
          <th>Date</th>
          <th>Method</th>
          <th>Reference</th>
          <th style="width:110px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${payRows}
        <tr style="font-weight:700;">
          <td colspan="4" class="bg" style="padding:5px 8px;"><strong>Total</strong></td>
          <td class="ar bg">${fmt(paidAmount)}</td>
        </tr>
      </tbody>
    </table>
  </div>` : ''}



</div><!-- .content -->

<div class="bottom-section">
<!-- TERMS & CONDITIONS -->
<div class="tnc-section">
  <div class="tnc-wrapper">
    <div class="tnc-bar bn">বিক্রয় পরবর্তী সেবা ও শর্তাবলী (Terms &amp; Conditions)</div>
    <div class="tnc-body bn">
      <div class="tnc-item"><span class="tnc-label">ল্যাপটপ ওয়ারেন্টি</span><span class="tnc-desc">১০ দিনের রিপ্লেসমেন্ট গ্যারান্টি (শুধুমাত্র হার্ডওয়্যার সমস্যার জন্য)। ২ বছরের ফ্রি সার্ভিস ওয়ারেন্টি। প্রয়োজনীয় পার্টস বা খুচরা যন্ত্রাংশের মূল্য গ্রাহককে বহন করতে হবে।</span></div>
      <div class="tnc-item"><span class="tnc-label">মোবাইল ওয়ারেন্টি</span><span class="tnc-desc">৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি। ১ বছরের ফ্রি সার্ভিস ওয়ারেন্টি। মোবাইলের Display এবং Motherboard কোনো ওয়ারেন্টির অন্তর্ভুক্ত নয়।</span></div>
      <div class="tnc-item"><span class="tnc-label">রিপ্লেসমেন্ট নীতি</span><span class="tnc-desc">রিপ্লেসমেন্টের ক্ষেত্রে একই মডেলের ডিভাইস প্রদান করা হবে। স্টক না থাকলে আলোচনা সাপেক্ষে অন্য মডেল নির্বাচন করা যাবে।</span></div>
      <div class="tnc-item"><span class="tnc-label">এক্সচেঞ্জ ও রিটার্ন</span><span class="tnc-desc">ক্রয়ের ২ মাসের মধ্যে Exchange করলে নূন্যতম ২০% মূল্য কর্তন হবে। ক্রয়ের ২ মাসের মধ্যে Return করলে নূন্যতম ৩০% মূল্য কর্তন হবে। ডিভাইসের কন্ডিশন যাচাই করে চূড়ান্ত মূল্য নির্ধারণ করা হবে।</span></div>
      <div class="tnc-item"><span class="tnc-label">ওয়ারেন্টি বাতিল</span><span class="tnc-desc">ডিভাইসে Physical Damage / Scratch থাকে। পানি বা Liquid Damage হয়। শর্ট সার্কিট বা ভোল্টেজের সমস্যায় ক্ষতি হয়। ওয়ারেন্টি সিল বা স্টিকার নষ্ট করা হয়। অন্য কোনো টেকনিশিয়ান দ্বারা ডিভাইস খোলা হয়।</span></div>
    </div>
    <div class="tnc-footer bn">গুরুত্বপূর্ণ: ওয়ারেন্টি সুবিধা পেতে অরিজিনাল ক্যাশ মেমো/বিল অবশ্যই সংরক্ষণ করতে হবে।</div>
  </div>
</div>

<!-- PAGE FOOTER -->
<div class="pg-footer">
  <div style="display:flex;align-items:center;gap:6px;">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
    <span>www.entercomputers.com.bd</span>
  </div>
  <div style="display:flex;align-items:center;gap:6px;">
    <span class="fb-icon">f</span>
    <span>fb.com/entercomputersmym</span>
  </div>
</div>
</div><!-- .bottom-section -->

</div><!-- .page -->

</body>
</html>`;
  if (!forPreview) {
    const printScript = '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>';
    return html.replace('</body>', printScript + '</body>');
  }
  return html;
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
  const handlePrint = () => {
    const html = buildInvoiceHTML(sale, false);
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Please allow pop-ups to print the invoice"); return; }
    w.document.write(html);
    w.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" showDivider={false}>
      {/* Custom header with title + action buttons */}
      <div className="flex items-center justify-between gap-3 mb-3 -mt-2">
        <h3 className="text-lg font-bold text-dark dark:text-white">Invoice Preview</h3>
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
          srcDoc={buildInvoiceHTML(sale, true)}
          className="w-full border-0 bg-white rounded shadow-sm"
          style={{ height: '72vh', minHeight: 520 }}
        />
      </div>
    </Modal>
  );
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
