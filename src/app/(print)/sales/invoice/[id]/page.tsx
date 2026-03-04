import { db } from "@/db";
import { sales, saleItems, payments as paymentsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { InvoiceActions } from "@/app/(print)/invoice-actions";

// ── number → BDT words ────────────────────────────────────────────────────
function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
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

// ── Page ──────────────────────────────────────────────────────────────────
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [sale] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  if (!sale) notFound();

  const items    = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.saleId, id));

  const grandTotal = parseFloat(sale.grandTotal);
  const paidAmount = parseFloat(sale.paidAmount);
  const dueAmount  = parseFloat(sale.dueAmount);
  const discount   = parseFloat(sale.discountAmount);
  const subtotal   = items.reduce((s, i) => s + parseFloat(i.amount), 0);

  const css = `
    /* ── reset page chrome for this route ── */
    body { background: #f3f4f6!important; }

    .inv-page-wrap {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #1a1a1a;
      padding: 24px;
    }
    .no-print { /* shown in browser */ }
    .inv-actions {
      max-width: 820px;
      margin: 0 auto 12px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    #invoice {
      max-width: 820px;
      margin: 0 auto;
      background: #fff;
      padding: 28px 32px;
      box-shadow: 0 2px 12px rgba(0,0,0,.15);
      border-top: 4px solid #FF6600;
    }

    /* Header */
    .hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; padding-bottom:12px; border-bottom:2px solid #FF6600; }
    .hdr-logo img { height:50px; }
    .hdr-right { text-align:right; }
    .hdr-right .shop-title { font-size:16px; font-weight:800; color:#FF6600; margin-bottom:2px; }
    .hdr-right .shop-addr-bn { font-size:9.5px; color:#333; line-height:1.4; }
    .hdr-right .shop-contact { font-size:9px; color:#555; margin-top:2px; line-height:1.3; }

    /* Bill of Supply banner */
    .bill-banner { background: linear-gradient(135deg, #FF6600, #FF8833); color:#fff; text-align:center; font-size:13px; font-weight:700; font-style:italic; padding:6px 0; margin-bottom:10px; border-radius:3px; letter-spacing:0.5px; }

    /* Customer / Invoice details row */
    .cust-inv-row { display:flex; justify-content:space-between; margin-bottom:10px; font-size:10px; }
    .cust-info { flex:1; }
    .cust-info .label { font-weight:700; color:#FF6600; font-size:10px; margin-bottom:3px; }
    .cust-info div { margin-bottom:1px; }
    .inv-details { text-align:right; }
    .inv-details .label { font-weight:700; color:#FF6600; font-size:10px; margin-bottom:3px; }
    .inv-details div { margin-bottom:1px; }

    /* Tables */
    table { width:100%; border-collapse:collapse; margin-bottom:8px; }
    th, td { border:1px solid #ddd; padding:4px 8px; font-size:10px; }
    thead th { background:#f7941d; color:#fff; font-weight:700; text-transform:uppercase; font-size:10px; }
    .tr { text-align:right; }
    .tc { text-align:center; }
    .at { vertical-align:top; }
    .mono { font-family:monospace; }
    .fw7 { font-weight:700; }
    .fw6 { font-weight:600; }
    tfoot td { background:#FFF5EB; font-weight:600; }
    tfoot tr:last-child td { background:#FFF0E0; font-weight:700; font-size:10px; }

    /* Section headers */
    .section-header { background: linear-gradient(135deg, #FF6600, #FF8833); color:#fff; font-weight:700; font-size:10px; padding:4px 10px; margin-top:6px; border-radius:2px; }
    .section-header-dark { background:#333; color:#fff; font-weight:700; font-size:10px; padding:4px 10px; margin-top:6px; border-radius:2px; }

    /* Amounts summary */
    .amounts-wrap { display:flex; gap:0; margin-bottom:10px; }
    .amounts-left { flex:1; border:1px solid #ddd; border-right:none; }
    .amounts-right { width:280px; border:1px solid #ddd; }
    .amounts-left .section-header, .amounts-right .section-header { margin-top:0; border-radius:0; }
    .amounts-row { display:flex; justify-content:space-between; padding:4px 10px; border-bottom:1px solid #eee; font-size:10px; }
    .amounts-row:last-child { border-bottom:none; }
    .amounts-row.total { font-weight:700; font-size:10px; background:#FFF5EB; }
    .amounts-row.due { color:#dc2626; font-weight:700; }

    /* Notes */
    .note { font-size:9px; color:#555; margin:3px 0; }

    /* Terms */
    .terms-list { padding-left:16px; margin-top:4px; }
    .terms-list li { font-size:9px; color:#444; line-height:1.5; margin-bottom:1px; }

    /* Signature */
    .signature-area { margin-top:24px; display:flex; justify-content:flex-end; }
    .signature-block { text-align:center; min-width:220px; }
    .signature-block img { height:50px; margin-bottom:3px; }
    .signature-block .sig-label { font-size:10px; font-weight:700; color:#FF6600; border-top:1px solid #FF6600; padding-top:3px; }

    /* Footer */
    .footer-note { text-align:center; font-size:8px; color:#9ca3af; margin-top:12px; padding-top:8px; border-top:1px solid #f3f4f6; }

    @media print {
      @page { size: A4; margin: 10mm 12mm; }
      body { background: #fff!important; }
      .no-print { display:none!important; }
      #invoice { box-shadow:none!important; padding:0!important; max-width:100%!important; border-top:4px solid #FF6600!important; }
      .inv-page-wrap { padding:0!important; }
      body > *:not(.inv-page-wrap) { display:none!important; }
      .bill-banner, .section-header, .section-header-dark, thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tfoot td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="inv-page-wrap">

        {/* Toolbar */}
        <InvoiceActions />

        {/* Invoice */}
        <div id="invoice">

          {/* Header — logo left, shop info right */}
          <div className="hdr">
            <div className="hdr-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/enter-logo.png" alt="Enter Computers" />
            </div>
            <div className="hdr-right">
              <div className="shop-title">Enter Computer&apos;s</div>
              <div className="shop-addr-bn">
                অলকা নদী বাংলা কমপ্লেক্স, ২য় তলা, দোকান নং - ২৩৮ - রামবাবু রোড,<br />
                গাংগিনারপার, সদর, ময়মনসিংহ।
              </div>
              <div className="shop-contact">
                Phone no.: 01684-134574, 01789-443043 Email:<br />
                entercomputersmym@gmail.com
              </div>
            </div>
          </div>

          {/* Bill of Supply Banner */}
          <div className="bill-banner">Bill of Supply</div>

          {/* Customer + Invoice Details Row */}
          <div className="cust-inv-row">
            <div className="cust-info">
              <div className="label">Bill To</div>
              <div><strong>{sale.customerName}</strong></div>
              <div>{(sale as any).customerAddress || ''}</div>
              <div>Contact No. : {sale.customerPhone}</div>
            </div>
            <div className="inv-details">
              <div className="label">Invoice Details</div>
              <div>Invoice No. : <strong>{sale.invoiceNumber}</strong></div>
              <div>Date : {fmtDate(sale.invoiceDate)}</div>
            </div>
          </div>

          {/* Items table */}
          <table>
            <thead>
              <tr>
                <th style={{ width: 28 }}>#</th>
                <th>Item name</th>
                <th className="mono" style={{ width: 120 }}>Serial No.</th>
                <th className="tc" style={{ width: 40 }}>Qty</th>
                <th className="tr" style={{ width: 80 }}>Price/ Unit</th>
                <th className="tr" style={{ width: 80 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id}>
                  <td className="at">{i + 1}</td>
                  <td className="at">
                    <div>{item.productName}</div>
                    {item.warranty && <div style={{ color: "#555", fontSize: 10 }}>{item.warranty}</div>}
                  </td>
                  <td className="at mono">{item.serialNumber}</td>
                  <td className="at tc" style={{ width: 40 }}>{item.quantity}</td>
                  <td className="at tr">{fmt(item.salePrice)} ৳</td>
                  <td className="at tr">{fmt(item.amount)} ৳</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}></td>
                <td className="fw7">Total</td>
                <td className="tr"></td>
                <td className="tr fw7">{fmt(subtotal)} ৳</td>
              </tr>
              {discount > 0 && (
                <tr>
                  <td colSpan={3}></td>
                  <td className="fw6">Discount</td>
                  <td className="tr"></td>
                  <td className="tr fw6">({fmt(discount)}) ৳</td>
                </tr>
              )}
            </tfoot>
          </table>

          {/* Invoice Amount In Words + Amounts Summary */}
          <div className="amounts-wrap">
            <div className="amounts-left">
              <div className="section-header">Invoice Amount In Words</div>
              <div style={{ padding: '8px 12px', fontSize: 11 }}>
                {amountInWords(grandTotal)}
              </div>
              <div className="section-header-dark">Terms and Conditions</div>
              <div style={{ padding: '6px 12px' }}>
                <div style={{ fontSize: 10, color: '#444', lineHeight: 1.6 }}>
                  * 7 Day&apos;s Replacement Guarantee with 365 day&apos;s Service Warranty (Without parts).<br />
                  * To apply for the warranty, the warranty sticker and serial number must be kept intact.<br />
                  * Warranty is not applicable for any external or electrical damage.
                </div>
              </div>
            </div>
            <div className="amounts-right">
              <div className="section-header">Amounts</div>
              <div className="amounts-row">
                <span>Sub Total</span>
                <span>{fmt(subtotal)} ৳</span>
              </div>
              {discount > 0 && (
                <div className="amounts-row">
                  <span>Discount</span>
                  <span>({fmt(discount)}) ৳</span>
                </div>
              )}
              <div className="amounts-row total">
                <span>Total</span>
                <span>{fmt(grandTotal)} ৳</span>
              </div>
              <div className="amounts-row">
                <span>Received</span>
                <span>{fmt(paidAmount)} ৳</span>
              </div>
              {dueAmount > 0 && (
                <div className="amounts-row due">
                  <span>Balance</span>
                  <span>{fmt(dueAmount)} ৳</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div style={{ marginTop: 10, marginBottom: 10 }}>
              <div className="section-header" style={{ marginBottom: 6 }}>Payment History</div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>SL.</th>
                    <th>Date</th>
                    <th style={{ width: 80 }}>Method</th>
                    <th>Reference</th>
                    <th className="tr" style={{ width: 90 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td>{fmtDateTime(p.paidAt)}</td>
                      <td>{p.method}</td>
                      <td>{p.reference || ""}</td>
                      <td className="tr">{fmt(parseFloat(p.amount))} ৳</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="fw7">Total</td>
                    <td className="tr fw7">{fmt(paidAmount)} ৳</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Signature */}
          <div className="signature-area">
            <div className="signature-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/entersign.png" alt="Authorized Signature" />
              <div className="sig-label">Authorized Signatory</div>
            </div>
          </div>

          <div className="footer-note">
            This is a computer generated invoice.
          </div>

        </div>
      </div>
    </>
  );
}
