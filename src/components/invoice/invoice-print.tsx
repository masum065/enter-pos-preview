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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Bill of Supply - Enter Computers</title>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;
      background: #e5e7eb;
      padding: 24px;
      margin: 0;
    }
    .bengali {
      font-family: 'Noto Sans Bengali', 'Hind Siliguri', sans-serif;
    }
    .logo-enter { color: #f97316; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
    .logo-comp  { color: #1a1a1a; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
    .logo-icon  {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 50%;
      background: #f97316; color: white; font-size: 13px; font-weight: 900;
      margin: 0 1px; vertical-align: middle; position: relative; top: -2px;
    }
    .inv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .inv-table th, .inv-table td { border: 1px solid #9ca3af; padding: 6px 8px; }
    .inv-table thead tr { background: #f9fafb; }
    .inv-table th { font-weight: 700; text-align: center; }

    /* T&C */
    .tnc-wrapper {
      border: 2px solid #222;
      position: relative;
      background: #fff;
    }
    .tnc-header-bar {
      position: absolute;
      top: -16px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      padding: 5px 22px;
      white-space: nowrap;
      border-radius: 3px;
    }
    .tnc-row {
      display: flex;
      align-items: stretch;
      border-bottom: 1px solid #d1d5db;
    }
    .tnc-row:last-of-type { border-bottom: none; }
    .tnc-label {
      background: #1a1a1a;
      color: #fff;
      font-weight: 800;
      font-size: 15px;
      padding: 10px 16px;
      border-radius: 8px;
      margin: 12px 10px 12px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 165px;
      width: 165px;
      text-align: center;
      flex-shrink: 0;
      line-height: 1.4;
    }
    .tnc-text {
      font-size: 12.5px;
      line-height: 1.75;
      padding: 12px 16px 12px 8px;
      color: #111;
      flex: 1;
    }
    .tnc-footer {
      background: #1a1a1a;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      padding: 9px 16px;
    }
    .page-footer {
      background: #2d2d2d;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 28px;
      font-size: 13px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none !important; }
      .tnc-wrapper, .tnc-header-bar, .tnc-label, .tnc-footer, .page-footer, .logo-icon, .inv-table thead tr {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    .mono { font-family: monospace; }
  </style>
</head>
<body>

<div class="container" style="background:#fff; max-width:900px; margin:0 auto; box-shadow:0 2px 16px rgba(0,0,0,0.13);">

  <!-- HEADER -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:20px 28px 16px; border-bottom:1px solid #d1d5db;">
    <div>
      <div style="line-height:1; display:flex; align-items:center;">
        <span class="logo-enter">ENTER</span>
        <span style="display:inline-flex; align-items:center;">
          <span class="logo-comp">&nbsp;COMP</span>
          <span class="logo-icon">⊙</span>
          <span class="logo-comp">TERS</span>
        </span>
      </div>
      <p class="bengali" style="font-size:11px; color:#555; margin-top:5px;">বেস্ট কোয়ালিটির প্রজেক্ট ইউজড ল্যাপটপ &amp; মোবাইল এর বিশ্বস্ত প্রতিষ্ঠান</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:20px; font-weight:800; color:#1a1a1a;">01789-443043&nbsp;&nbsp;01684-134574</p>
      <p class="bengali" style="font-size:11.5px; color:#555; margin-top:4px;">অলকা নদী বাংলা কমপ্লেক্স ২য় তলা দোকান নং ২৩৮</p>
      <p class="bengali" style="font-size:11.5px; color:#555;">রাম বাবু রোড, গাংগিনারপার, সদর, ময়মনসিংহ।</p>
    </div>
  </div>

  <!-- TITLE ROW -->
  <div style="display:flex; align-items:center; justify-content:space-between; padding:9px 28px; border-bottom:1px solid #d1d5db;">
    <div style="flex:1; text-align:center;">
      <span style="font-size:17px; font-weight:700;">Bill of Supply</span>
    </div>
    <div style="font-size:13px; font-weight:600; white-space:nowrap;">
      NO: <strong>${sale.invoiceNumber}</strong>
    </div>
  </div>

  <!-- CUSTOMER -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:10px 28px; border-bottom:1px solid #d1d5db;">
    <div style="font-size:13px; line-height:1.9;">
      <span><strong>Customer:</strong> ${sale.customerName} &nbsp;&nbsp; <strong>Phone:</strong> ${sale.customerPhone}</span><br/>
      ${sale.customerAddress ? `<span><strong>Address:</strong> ${sale.customerAddress}</span>` : ''}
    </div>
    <div style="text-align:right; font-size:13px; line-height:1.9;">
      <span><strong>Salesman:</strong> System Administrator</span><br/>
      <div style="border:1px solid #9ca3af; padding:3px 14px; display:inline-block; font-size:13px; margin-top:2px;">
        Date: ${fmtDateTime(sale.invoiceDate)}
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <div style="padding:16px 28px 8px;">
    <table class="inv-table">
      <thead>
        <tr>
          <th style="width:38px;">SL.</th>
          <th style="text-align:left; padding-left:12px;">ITEM</th>
          <th style="width:74px;">WARRANTY</th>
          <th style="width:108px;">SERIAL NO.</th>
          <th style="width:42px;">QTY</th>
          <th style="width:100px;">PRICE</th>
          <th style="width:100px;">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr style="height:26px;">
          <td colspan="5" rowspan="${discount > 0 ? 3 : 2}" style="vertical-align:middle; padding:8px 10px;">
            <strong>Amount In Words:</strong> ${amountInWords(grandTotal)}
          </td>
          <td style="text-align:right; font-weight:700; background:#f9fafb;">Total</td>
          <td style="text-align:right;">${fmt(subtotal)}</td>
        </tr>
        ${discount > 0 ? `<tr>
          <td style="text-align:right; font-weight:700; background:#f9fafb;">Discount</td>
          <td style="text-align:right;">(${fmt(discount)})</td>
        </tr>` : ""}
        <tr>
          <td style="text-align:right; font-weight:700; background:#f9fafb;">Grand Total</td>
          <td style="text-align:right; font-weight:700;">${fmt(grandTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- PAID DUE -->
  <div style="padding:6px 28px; text-align:right; font-size:13.5px; font-weight:700;">
    Paid: ${fmt(paidAmount)} Tk &nbsp;&nbsp; Due: ${fmt(dueAmount)} Tk
  </div>

  <!-- NOTE -->
  <div style="padding:2px 28px 10px; font-size:12px; color:#666; font-style:italic;">
    Good received by customer in good condition.
  </div>

  <!-- PAYMENT HISTORY -->
  ${sale.payments?.length > 0 ? `
  <div style="padding:4px 28px 24px;">
    <p style="font-size:13px; font-weight:700; margin-bottom:8px;">Payment History</p>
    <table class="inv-table">
      <thead>
        <tr>
          <th style="width:38px;">Sl.</th>
          <th>Date</th>
          <th>Method</th>
          <th>Reference</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${payRows}
        <tr style="background:#f9fafb; font-weight:700;">
          <td colspan="4" style="padding:6px 8px; text-align:center;">Total</td>
          <td style="text-align:right;">${fmt(paidAmount)}</td>
        </tr>
      </tbody>
    </table>
  </div>` : ""}

  <!-- TERMS & CONDITIONS -->
  <div style="padding:0 28px 30px;">
    <div class="tnc-wrapper">
      <div class="tnc-header-bar bengali">
        বিক্রয় পরবর্তী সেবা ও শর্তাবলী (Terms &amp; Conditions)
      </div>
      <div style="margin-top:22px;">
        <div class="tnc-row">
          <div class="tnc-label bengali">ল্যাপটপ ওয়ারেন্টি</div>
          <div class="tnc-text bengali">
            ১০ দিনের রিপ্লেসমেন্ট গ্যারান্টি (শুধুমাত্র হার্ডওয়্যার সমস্যার জন্য)। ২ বছরের ফ্রি সার্ভিস ওয়ারেন্টি। প্রয়োজনীয় পার্টস বা খুচরা যন্ত্রাংশের মূল্য গ্রাহককে বহন করতে হবে।
          </div>
        </div>
        <div class="tnc-row">
          <div class="tnc-label bengali">মোবাইল ওয়ারেন্টি</div>
          <div class="tnc-text bengali">
            ৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি। ১ বছরের ফ্রি সার্ভিস ওয়ারেন্টি। মোবাইলের Display এবং Motherboard কোনো ওয়ারেন্টির অন্তর্ভুক্ত নয়।
          </div>
        </div>
        <div class="tnc-row">
          <div class="tnc-label bengali">রিপ্লেসমেন্ট নীতি</div>
          <div class="tnc-text bengali">
            রিপ্লেসমেন্টের ক্ষেত্রে একই মডেলের ডিভাইস প্রদান করা হবে। স্টক না থাকলে আলোচনা সাপেক্ষে অন্য মডেল নির্বাচন করা যাবে।
            এক্সচেঞ্জ ও রিটার্ন: ক্রয়ের ২ মাসের মধ্যে Exchange করলে নূন্যতম ২০% মূল্য কর্তন হবে। ক্রয়ের ২ মাসের মধ্যে Return করলে নূন্যতম ৩০% মূল্য কর্তন হবে। ডিভাইসের কন্ডিশন যাচাই করে চূড়ান্ত মূল্য নির্ধারণ করা হবে।
          </div>
        </div>
        <div class="tnc-row">
          <div class="tnc-label bengali">এক্সচেঞ্জ ও রিটার্ন</div>
          <div class="tnc-text bengali">
            ওয়ারেন্টি বাতিল হবে যদি: ডিভাইসে Physical Damage / Scratch থাকে। পানি বা Liquid Damage হয়। শর্ট সার্কিট বা ভোল্টেজের সমস্যায় ক্ষতি হয়। ওয়ারেন্টি সিল বা স্টিকার নষ্ট করা হয়। অন্য কোনো টেকনিশিয়ান দ্বারা ডিভাইস খোলা হয়।
          </div>
        </div>
        <div class="tnc-footer bengali">
          গুরুত্বপূর্ণ: ওয়ারেন্টি সুবিধা পেতে অরিজিনাল ক্যাশ মেমো/বিল অবশ্যই সংরক্ষণ করতে হবে।
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE FOOTER -->
  <div class="page-footer">
    <div style="display:flex; align-items:center; gap:8px;">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      <span>www.entercomputers.com.bd</span>
    </div>
    <div style="display:flex; align-items:center; gap:8px;">
      <div style="background:#1877f2; color:white; font-weight:900; font-size:13px; width:20px; height:20px; display:flex; align-items:center; justify-content:center; border-radius:3px; padding-left: 5px;">f</div>
      <span>fb.com/entercomputersmym</span>
    </div>
  </div>

</div>

<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
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
      <div className="bg-gray-200 p-2 sm:p-4 rounded-lg">
        <iframe
          srcDoc={buildInvoiceHTML(sale).replace('<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>', '')}
          className="w-full h-[65vh] border-0 bg-transparent rounded-sm shadow-sm outline-none"
        />
      </div>

      <div className="mt-5 flex justify-center gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Close
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2.5 font-medium text-white hover:bg-orange-600"
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
