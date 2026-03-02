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
      font-size: 11px;
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
    }
    .hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
    .logo { font-size:26px; font-weight:900; font-style:italic; letter-spacing:-0.5px; }
    .shop-name { font-weight:700; font-size:11px; margin-top:4px; }
    .shop-addr { font-size:10px; color:#555; max-width:300px; line-height:1.4; margin-top:2px; }
    .inv-box { border:1px solid #9ca3af; font-size:11px; }
    .inv-box-title { text-align:center; font-weight:700; border-bottom:1px solid #9ca3af; padding:4px 16px; }
    .inv-box-row { padding:4px 16px; border-bottom:1px solid #e5e7eb; }
    .inv-box-row:last-child { border-bottom:none; }
    hr.divider { border:none; border-top:1px solid #9ca3af; margin:8px 0; }
    .cust-row { display:flex; flex-wrap:wrap; gap:0 20px; margin-bottom:4px; font-size:11px; }
    table { width:100%; border-collapse:collapse; }
    th, td { border:1px solid #9ca3af; padding:4px 8px; font-size:11px; }
    thead th { background:#f3f4f6; font-weight:700; }
    .tr { text-align:right; }
    .tc { text-align:center; }
    .at { vertical-align:top; }
    .mono { font-family:monospace; }
    .fw7 { font-weight:700; }
    .fw6 { font-weight:600; }
    .note { font-size:10px; color:#555; margin:4px 0; }
    .paid-due { text-align:right; font-weight:700; font-size:11px; margin:4px 0; }
    .due-red { color:#dc2626; }
    .terms-list { padding-left:16px; }
    .terms-list li { font-size:10px; color:#444; line-height:1.5; margin-bottom:2px; }
    .footer-note { text-align:center; font-size:9px; color:#9ca3af; margin-top:20px; }

    @media print {
      @page { size: A4; margin: 10mm 12mm; }
      body { background: #fff!important; }
      .no-print { display:none!important; }
      #invoice { box-shadow:none!important; padding:0!important; max-width:100%!important; }
      .inv-page-wrap { padding:0!important; }
      /* Hide Next.js dev overlay, sidebar, header — everything except invoice */
      body > *:not(.inv-page-wrap) { display:none!important; }
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

          {/* Header */}
          <div className="hdr">
            <div>
              <div className="logo">ENTER</div>
              <div className="shop-name">Enter Computers</div>
              <div className="shop-addr">
                Dhaka, Bangladesh<br />
                Phone: +880 1234-567890 &nbsp;|&nbsp; info@entercomputers.com
              </div>
            </div>
            <div className="inv-box">
              <div className="inv-box-title">Invoice / Bill</div>
              <div className="inv-box-row">NO: <strong>{sale.invoiceNumber}</strong></div>
              <div className="inv-box-row">Date: {fmtDate(sale.invoiceDate)}</div>
            </div>
          </div>

          <hr className="divider" />

          {/* Customer */}
          <div style={{ marginBottom: 8 }}>
            <div className="cust-row">
              <span><strong>Customer:</strong> {sale.customerName}</span>
              <span><strong>Phone:</strong> {sale.customerPhone}</span>
            </div>
          </div>

          {/* Items table */}
          <table style={{ marginBottom: 6 }}>
            <thead>
              <tr>
                <th style={{ width: 28 }}>SL.</th>
                <th>ITEM</th>
                <th className="mono" style={{ width: 120 }}>SERIAL NO.</th>
                <th className="tc" style={{ width: 36 }}>QTY</th>
                <th className="tr" style={{ width: 80 }}>PRICE</th>
                <th className="tr" style={{ width: 80 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id}>
                  <td className="at">{i + 1}</td>
                  <td className="at">
                    <div>{item.productName}</div>
                    {item.warranty && <div style={{ color: "#555" }}>{item.warranty}</div>}
                  </td>
                  <td className="at mono">{item.serialNumber}</td>
                  <td className="at tc">{item.quantity}</td>
                  <td className="at tr">{fmt(item.salePrice)}</td>
                  <td className="at tr">{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}></td>
                <td className="tr fw6">Total</td>
                <td className="tr">{fmt(subtotal)}</td>
              </tr>
              {discount > 0 && (
                <tr>
                  <td colSpan={4}></td>
                  <td className="tr fw6">Discount</td>
                  <td className="tr">({fmt(discount)})</td>
                </tr>
              )}
              <tr>
                <td colSpan={4}></td>
                <td className="tr fw7">Grand Total</td>
                <td className="tr fw7">{fmt(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Amount words + paid/due */}
          <div style={{ fontSize: 11, marginBottom: 2 }}>
            <strong>Amount In Words:</strong> {amountInWords(grandTotal)}
          </div>
          <div className="paid-due">
            <span>Paid: {fmt(paidAmount)} Tk</span>
            &nbsp;&nbsp;
            <span className={dueAmount > 0 ? "due-red" : ""}>
              Due: {fmt(dueAmount)} Tk
            </span>
          </div>
          <p className="note">Good received by customer in good condition.</p>

          {/* Payment history */}
          {payments.length > 0 && (
            <div style={{ marginTop: 10, marginBottom: 10 }}>
              <div className="fw7" style={{ fontSize: 11, marginBottom: 4 }}>Payment History</div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 28 }}>Sl.</th>
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
                      <td className="tr">{fmt(parseFloat(p.amount))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="fw7">Total</td>
                    <td className="tr fw7">{fmt(paidAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <p className="note">VAT and TAX not included if not mentioned in the item field.</p>

          {/* Terms */}
          <div style={{ marginTop: 10 }}>
            <div className="fw7" style={{ fontSize: 11, marginBottom: 4 }}>Terms &amp; Conditions:</div>
            <ol className="terms-list">
              <li>Goods once sold will not be refunded &amp; exchanged without valid reason.</li>
              <li>Products under warranty will be repaired or replaced per manufacturer policy.</li>
              <li>Warranty timing is controlled by the manufacturing company.</li>
              <li>Warranty does not cover: physical damage, liquid spillage, removed stickers, software/data, or accessories.</li>
              <li>Please retain this invoice for all warranty claims.</li>
            </ol>
          </div>

          <div className="footer-note">
            This is a system generated invoice — seal &amp; sign are not mandatory.
          </div>

        </div>
      </div>
    </>
  );
}
