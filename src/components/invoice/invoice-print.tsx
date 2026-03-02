"use client";

import { useRef, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";

interface Sale {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  items: any[];
  payments: any[];
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  [key: string]: any;
}

interface InvoicePrintProps {
  sale: Sale;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoicePrintModal({ sale, isOpen, onClose }: InvoicePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const appSettings = {
    shopName: "Enter Computer",
    shopAddress: "Dhaka, Bangladesh",
    shopPhone: "+880 1234 567890",
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    
    if (!printWindow) {
      alert("Please allow pop-ups to print the invoice");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${sale.invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .invoice-container { padding: 30px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .shop-name { font-size: 28px; font-weight: bold; color: #1a1a1a; }
            .shop-info { color: #666; margin-top: 8px; font-size: 14px; }
            .invoice-title { font-size: 22px; font-weight: bold; margin-top: 15px; color: #333; }
            .invoice-meta { display: flex; justify-content: space-between; margin: 25px 0; }
            .meta-box { padding: 15px; background: #f8f9fa; border-radius: 8px; flex: 1; margin: 0 5px; }
            .meta-box:first-child { margin-left: 0; }
            .meta-box:last-child { margin-right: 0; }
            .meta-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-value { font-size: 16px; font-weight: 600; margin-top: 4px; color: #333; }
            .section-title { font-size: 14px; font-weight: 600; color: #666; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #333; color: white; padding: 12px; text-align: left; font-weight: 600; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .serial { font-family: monospace; font-size: 13px; color: #666; }
            .totals { margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .total-row.grand { border-top: 2px solid #333; border-bottom: none; padding-top: 15px; margin-top: 10px; }
            .total-label { color: #666; }
            .total-value { font-weight: 600; }
            .total-row.grand .total-label, .total-row.grand .total-value { font-size: 20px; color: #333; }
            .payments { margin-top: 25px; padding: 20px; background: #f0fdf4; border-radius: 8px; }
            .payment-item { display: flex; justify-content: space-between; padding: 6px 0; }
            .due-amount { background: #fef2f2; padding: 15px; border-radius: 8px; margin-top: 15px; }
            .due-amount .total-value { color: #dc2626; }
            .footer { margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
            .footer-text { color: #666; font-size: 14px; }
            .warranty-note { margin-top: 15px; padding: 15px; background: #fffbeb; border-radius: 8px; font-size: 13px; color: #92400e; }
            @media print {
              body { padding: 0; }
              .invoice-container { padding: 20px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    // Open the dedicated server-rendered invoice page in a new tab
    // The page has proper print CSS — user can Ctrl+P or click Print button for HD PDF
    window.open(`/sales/invoice/${sale.id}`, "_blank");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Preview" size="lg">
      {/* Invoice Content */}
      <div ref={printRef} className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 text-left dark:border-gray-700 dark:bg-white">
        <div className="invoice-container">
          {/* Header */}
          <div className="header border-b-2 border-gray-800 pb-5 text-center">
            <div className="shop-name text-2xl font-bold text-gray-900">{appSettings.shopName}</div>
            <div className="shop-info mt-2 text-sm text-gray-600">
              {appSettings.shopAddress} | {appSettings.shopPhone}
            </div>
            <div className="invoice-title mt-4 text-xl font-bold text-gray-800">INVOICE</div>
          </div>

          {/* Invoice Meta */}
          <div className="invoice-meta my-6 flex gap-3">
            <div className="meta-box flex-1 rounded-lg bg-gray-100 p-4">
              <div className="meta-label text-xs uppercase text-gray-500">Invoice No</div>
              <div className="meta-value mt-1 text-lg font-semibold text-gray-900">{sale.invoiceNumber}</div>
            </div>
            <div className="meta-box flex-1 rounded-lg bg-gray-100 p-4">
              <div className="meta-label text-xs uppercase text-gray-500">Date</div>
              <div className="meta-value mt-1 text-lg font-semibold text-gray-900">{formatDate(sale.invoiceDate)}</div>
            </div>
            <div className="meta-box flex-1 rounded-lg bg-gray-100 p-4">
              <div className="meta-label text-xs uppercase text-gray-500">Status</div>
              <div className="meta-value mt-1 text-lg font-semibold capitalize text-gray-900">{sale.status}</div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-6">
            <div className="section-title mb-2 text-sm font-semibold uppercase text-gray-500">Bill To</div>
            <div className="text-lg font-semibold text-gray-900">{sale.customerName}</div>
            <div className="text-gray-600">{sale.customerPhone}</div>
          </div>

          {/* Items Table */}
          <table className="w-full">
            <thead>
              <tr>
                <th className="bg-gray-800 px-3 py-3 text-left text-white">Item</th>
                <th className="bg-gray-800 px-3 py-3 text-left text-white">Serial</th>
                <th className="bg-gray-800 px-3 py-3 text-left text-white">Warranty</th>
                <th className="bg-gray-800 px-3 py-3 text-right text-white">Price</th>
              </tr>
            </thead>
            <tbody>
              {(sale.items || []).map((item, idx) => (
                <tr key={idx}>
                  <td className="border-b border-gray-200 px-3 py-3 text-gray-900">{item.productName}</td>
                  <td className="serial border-b border-gray-200 px-3 py-3 font-mono text-sm text-gray-600">{item.serialNumber}</td>
                  <td className="border-b border-gray-200 px-3 py-3 text-sm text-gray-600">{item.warranty || "No Warranty"}</td>
                  <td className="border-b border-gray-200 px-3 py-3 text-right text-gray-900">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals mt-6">
            <div className="total-row flex justify-between border-b border-gray-200 py-2">
              <span className="total-label text-gray-600">Subtotal</span>
              <span className="total-value font-semibold text-gray-900">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="total-row flex justify-between border-b border-gray-200 py-2">
                <span className="total-label text-gray-600">Discount</span>
                <span className="total-value font-semibold text-red-600">-{formatCurrency(sale.discountAmount)}</span>
              </div>
            )}
            <div className="total-row grand mt-3 flex justify-between border-t-2 border-gray-800 pt-4">
              <span className="total-label text-xl font-bold text-gray-900">Grand Total</span>
              <span className="total-value text-xl font-bold text-gray-900">{formatCurrency(sale.grandTotal)}</span>
            </div>
          </div>

          {/* Payments */}
          {(sale.payments || []).length > 0 && (
            <div className="payments mt-6 rounded-lg bg-green-50 p-5">
              <div className="section-title mb-3 text-sm font-semibold uppercase text-gray-500">Payments Received</div>
              {(sale.payments || []).map((payment, idx) => (
                <div key={idx} className="payment-item flex justify-between py-1">
                  <span className="text-gray-700">{payment.method}</span>
                  <span className="font-semibold text-green-700">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
              <div className="payment-item mt-2 flex justify-between border-t border-green-200 pt-2">
                <span className="font-semibold text-gray-700">Total Paid</span>
                <span className="font-bold text-green-700">{formatCurrency(sale.paidAmount)}</span>
              </div>
            </div>
          )}

          {/* Due Amount */}
          {sale.dueAmount > 0 && (
            <div className="due-amount mt-4 rounded-lg bg-red-50 p-4">
              <div className="total-row flex justify-between">
                <span className="total-label font-semibold text-red-700">Due Amount</span>
                <span className="total-value font-bold text-red-600">{formatCurrency(sale.dueAmount)}</span>
              </div>
            </div>
          )}

          {/* Warranty Note */}
          <div className="warranty-note mt-6 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
            <strong>Warranty Notice:</strong> Please keep this invoice for any warranty claims. 
            The warranty is valid from the date of purchase mentioned above. 
            All items marked with warranty terms are covered as per their respective descriptions.
          </div>

          {/* Footer */}
          <div className="footer mt-8 border-t border-gray-200 pt-5 text-center">
            <div className="footer-text text-sm text-gray-500">
              Thank you for your business!
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Generated on {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Close
        </button>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-2.5 font-medium text-white shadow-lg transition-all hover:shadow-xl"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Quick Print
        </button>
      </div>
    </Modal>
  );
}

// Simple button component to trigger print modal
interface PrintInvoiceButtonProps {
  sale: Sale;
  variant?: "icon" | "button";
  className?: string;
}

export function PrintInvoiceButton({ sale, variant = "icon", className = "" }: PrintInvoiceButtonProps) {
  const [showModal, setShowModal] = useState(false);

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`rounded-lg p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 ${className}`}
          title="Print Invoice"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </button>
        <InvoicePrintModal sale={sale} isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 ${className}`}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print Invoice
      </button>
      <InvoicePrintModal sale={sale} isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
