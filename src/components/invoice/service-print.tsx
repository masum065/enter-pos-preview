"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";

interface ServiceRecord {
  id: string;
  serviceNumber: string;
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  problemDescription: string;
  diagnosis?: string;
  solutionApplied?: string;
  technicianNotes?: string;
  status: string;
  paymentStatus: string;
  totalCost: string | number;
  serviceCharge: string | number;
  partsCost: string | number;
  paidAmount: string | number;
  dueAmount: string | number;
  receivedDate: string;
  expectedDeliveryDate?: string | null;
  createdByName?: string;
  [key: string]: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(n: number | string): string {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string | Date): string {
  if (!d) return "—";
  const date = new Date(d);
  const dd  = String(date.getDate()).padStart(2, "0");
  const mon = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][date.getMonth()];
  return `${dd}-${mon}-${date.getFullYear()}`;
}

function getIssues(desc: string): string[] {
  return (desc || "").split("\n").map(s => s.trim()).filter(Boolean);
}

// ── Build printable HTML ──────────────────────────────────────────────────
function buildServiceHTML(s: ServiceRecord): string {
  const serviceCharge = Number(s.serviceCharge);
  const partsCost     = Number(s.partsCost);
  const totalCost     = Number(s.totalCost);
  const paidAmount    = Number(s.paidAmount);
  const dueAmount     = Number(s.dueAmount);
  const issues        = getIssues(s.problemDescription);

  const issueRows = issues.map((issue, i) =>
    `<tr><td class="at" style="width:36px;white-space:nowrap;">${i + 1}</td><td class="at">${issue}</td></tr>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Service — ${s.serviceNumber}</title>
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
  .section-title{font-weight:700;font-size:11px;margin:10px 0 4px;}
  .status-badge{display:inline-block;border:1px solid #1a1a1a;border-radius:3px;padding:1px 6px;font-size:10px;font-weight:700;}
  .sig-row{margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;display:flex;justify-content:flex-end;}
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
      <div class="inv-box-title">Service Invoice</div>
      <div class="inv-box-row">NO: <strong>${s.serviceNumber}</strong></div>
      <div class="inv-box-row">Received: ${fmtDate(s.receivedDate)}</div>
      ${s.expectedDeliveryDate ? `<div class="inv-box-row">Expected: ${fmtDate(s.expectedDeliveryDate)}</div>` : ""}
    </div>
  </div>

  <div style="padding-top:8px;margin-bottom:8px;">
    <div class="row">
      <span><strong>Customer:</strong> ${s.customerName}</span>
      <span><strong>Phone:</strong> ${s.customerPhone}</span>
    </div>
    <div class="row">
      <span><strong>Device:</strong> ${s.deviceBrand} ${s.deviceModel}</span>
      <span><strong>Status:</strong> <span class="status-badge">${s.status}</span></span>
    </div>
    ${s.createdByName ? `<div class="row"><span><strong>Received By:</strong> ${s.createdByName}</span></div>` : ""}
  </div>

  <div class="section-title">Reported Issues:</div>
  <table style="margin-bottom:8px;">
    <thead>
      <tr>
        <th style="width:36px;white-space:nowrap;">SL.</th>
        <th>Issue / Problem Description</th>
      </tr>
    </thead>
    <tbody>
      ${issueRows || `<tr><td class="at">1</td><td class="at">${s.problemDescription}</td></tr>`}
    </tbody>
  </table>

  ${s.diagnosis ? `<p class="note" style="margin-top:4px;"><strong>Diagnosis:</strong> ${s.diagnosis}</p>` : ""}
  ${s.solutionApplied ? `<p class="note"><strong>Solution Applied:</strong> ${s.solutionApplied}</p>` : ""}

  <div class="section-title">Service Charges:</div>
  <table style="margin-bottom:8px;">
    <thead>
      <tr>
        <th>Description</th>
        <th class="tr" style="width:130px">Amount (BDT)</th>
      </tr>
    </thead>
    <tbody>
      ${serviceCharge > 0 ? `<tr><td class="at">Service Charge</td><td class="at tr">${fmt(serviceCharge)}</td></tr>` : ""}
      ${partsCost > 0 ? `<tr><td class="at">Parts / Components Cost</td><td class="at tr">${fmt(partsCost)}</td></tr>` : ""}
    </tbody>
    <tfoot>
      <tr>
        <td style="font-size:11px;"><strong>Payment Status:</strong> <span class="status-badge">${s.paymentStatus}</span></td>
        <td class="tr fw7">Total: ${fmt(totalCost)}</td>
      </tr>
    </tfoot>
  </table>

  <div style="text-align:right;font-weight:700;font-size:11px;margin:4px 0;">
    <span>Paid: ${fmt(paidAmount)} Tk</span>&nbsp;&nbsp;
    <span${dueAmount > 0 ? ' style="font-weight:700;"' : ""}>Due: ${fmt(dueAmount)} Tk</span>
  </div>

  <p class="note">VAT and TAX not included unless mentioned above.</p>

  <div style="margin-top:10px;">
    <div class="section-title">Terms &amp; Conditions:</div>
    <ol style="padding-left:16px;">
      <li style="font-size:10px;color:#444;line-height:1.5;margin-bottom:2px;">Enter Computers is not responsible for pre-existing damage or data loss during repair.</li>
      <li style="font-size:10px;color:#444;line-height:1.5;margin-bottom:2px;">Devices not collected within 30 days will not be the responsibility of Enter Computers.</li>
      <li style="font-size:10px;color:#444;line-height:1.5;margin-bottom:2px;">Service warranty is 7 days from delivery date for the same issue only.</li>
      <li style="font-size:10px;color:#444;line-height:1.5;margin-bottom:2px;">Full payment is required before device delivery.</li>
      <li style="font-size:10px;color:#444;line-height:1.5;margin-bottom:2px;">Please retain this invoice for all warranty and service claims.</li>
    </ol>
  </div>

  <div class="sig-row">
    <div class="sig-box">
      <div style="height:48px;"></div>
      <div style="border-top:1px dotted #9ca3af;padding-top:4px;font-size:10px;">Issued By</div>
      <div style="font-size:10px;color:#555;margin-top:2px;">Enter Computers</div>
    </div>
  </div>

  <div class="footer-note">This is a system generated service invoice.</div>

  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body>
</html>`;
}

// ── Style helpers ─────────────────────────────────────────────────────────
function th(extra: React.CSSProperties = {}): React.CSSProperties {
  return { border: "1px solid #9ca3af", padding: "4px 8px", fontSize: 11, background: "#f3f4f6", fontWeight: 700, textAlign: "left", wordBreak: "break-word", ...extra };
}
function td(extra: React.CSSProperties = {}): React.CSSProperties {
  return { border: "1px solid #9ca3af", padding: "4px 8px", fontSize: 11, wordBreak: "break-word", ...extra };
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function ServicePrintModal({
  service,
  isOpen,
  onClose,
}: {
  service: ServiceRecord;
  isOpen: boolean;
  onClose: () => void;
}) {
  const serviceCharge = Number(service.serviceCharge);
  const partsCost     = Number(service.partsCost);
  const totalCost     = Number(service.totalCost);
  const paidAmount    = Number(service.paidAmount);
  const dueAmount     = Number(service.dueAmount);
  const issues        = getIssues(service.problemDescription);

  const handlePrint = () => {
    const html = buildServiceHTML(service);
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Please allow pop-ups to print"); return; }
    w.document.write(html);
    w.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Service Invoice Preview" size="lg">
      <div
        style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 11, color: "#1a1a1a" }}
        className="max-h-[65vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 text-left dark:border-gray-700 dark:bg-white"
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, fontStyle: "italic", letterSpacing: -0.5 }}>ENTER</div>
            <div style={{ fontWeight: 700, fontSize: 11, marginTop: 3 }}>Enter Computers</div>
            <div style={{ fontSize: 10, color: "#555", lineHeight: 1.4, marginTop: 2 }}>
              Dhaka, Bangladesh<br />Phone: +880 1234-567890 | info@entercomputers.com
            </div>
          </div>
          <div style={{ border: "1px solid #9ca3af", fontSize: 11, minWidth: 180 }}>
            <div style={{ textAlign: "center", fontWeight: 700, borderBottom: "1px solid #9ca3af", padding: "4px 16px" }}>Service Invoice</div>
            <div style={{ padding: "4px 16px", borderBottom: "1px solid #e5e7eb" }}>NO: <strong>{service.serviceNumber}</strong></div>
            <div style={{ padding: "4px 16px", borderBottom: "1px solid #e5e7eb" }}>Received: {fmtDate(service.receivedDate)}</div>
            {service.expectedDeliveryDate && (
              <div style={{ padding: "4px 16px" }}>Expected: {fmtDate(service.expectedDeliveryDate)}</div>
            )}
          </div>
        </div>

        {/* Customer + Device */}
        <div style={{ paddingTop: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 20px", marginBottom: 3 }}>
            <span><strong>Customer:</strong> {service.customerName}</span>
            <span><strong>Phone:</strong> {service.customerPhone}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 20px", marginBottom: 3 }}>
            <span><strong>Device:</strong> {service.deviceBrand} {service.deviceModel}</span>
            <span>
              <strong>Status:</strong>{" "}
              <span style={{ display: "inline-block", border: "1px solid #1a1a1a", borderRadius: 3, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                {service.status}
              </span>
            </span>
          </div>
          {service.createdByName && (
            <div style={{ fontSize: 11 }}><strong>Received By:</strong> {service.createdByName}</div>
          )}
        </div>

        {/* Issues Table */}
        <div style={{ fontWeight: 700, fontSize: 11, margin: "10px 0 4px" }}>Reported Issues:</div>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", border: "1px solid #9ca3af", marginBottom: 8 }}>
          <thead>
            <tr>
              <th style={th({ width: 40, whiteSpace: "nowrap" })}>SL.</th>
              <th style={th()}>Issue / Problem Description</th>
            </tr>
          </thead>
          <tbody>
            {(issues.length > 0 ? issues : [service.problemDescription]).map((issue, i) => (
              <tr key={i}>
                <td style={td({ verticalAlign: "top" })}>{i + 1}</td>
                <td style={td({ verticalAlign: "top" })}>{issue}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {service.diagnosis && (
          <p style={{ fontSize: 10, color: "#555", margin: "4px 0" }}><strong>Diagnosis:</strong> {service.diagnosis}</p>
        )}
        {service.solutionApplied && (
          <p style={{ fontSize: 10, color: "#555", margin: "4px 0" }}><strong>Solution Applied:</strong> {service.solutionApplied}</p>
        )}

        {/* Charges Table */}
        <div style={{ fontWeight: 700, fontSize: 11, margin: "10px 0 4px" }}>Service Charges:</div>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", border: "1px solid #9ca3af", marginBottom: 8 }}>
          <thead>
            <tr>
              <th style={th()}>Description</th>
              <th style={th({ width: 130, textAlign: "right" })}>Amount (BDT)</th>
            </tr>
          </thead>
          <tbody>
            {serviceCharge > 0 && (
              <tr>
                <td style={td({ verticalAlign: "top" })}>Service Charge</td>
                <td style={td({ verticalAlign: "top", textAlign: "right" })}>{fmt(serviceCharge)}</td>
              </tr>
            )}
            {partsCost > 0 && (
              <tr>
                <td style={td({ verticalAlign: "top" })}>Parts / Components Cost</td>
                <td style={td({ verticalAlign: "top", textAlign: "right" })}>{fmt(partsCost)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td style={td({ fontSize: 11 })}>
                <strong>Payment Status:</strong>{" "}
                <span style={{ display: "inline-block", border: "1px solid #1a1a1a", borderRadius: 3, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                  {service.paymentStatus}
                </span>
              </td>
              <td style={td({ textAlign: "right", fontWeight: 700 })}>Total: {fmt(totalCost)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Paid / Due */}
        <div style={{ textAlign: "right", fontWeight: 700, fontSize: 11, margin: "4px 0" }}>
          <span>Paid: {fmt(paidAmount)} Tk</span>&nbsp;&nbsp;
          <span>Due: {fmt(dueAmount)} Tk</span>
        </div>

        <p style={{ fontSize: 10, color: "#555", margin: "8px 0" }}>VAT and TAX not included unless mentioned above.</p>

        {/* Terms */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>Terms &amp; Conditions:</div>
          <ol style={{ paddingLeft: 16 }}>
            {[
              "Enter Computers is not responsible for pre-existing damage or data loss during repair.",
              "Devices not collected within 30 days will not be the responsibility of Enter Computers.",
              "Service warranty is 7 days from delivery date for the same issue only.",
              "Full payment is required before device delivery.",
              "Please retain this invoice for all warranty and service claims.",
            ].map((t, i) => (
              <li key={i} style={{ fontSize: 10, color: "#444", lineHeight: 1.5, marginBottom: 2 }}>{t}</li>
            ))}
          </ol>
        </div>

        {/* Signature — right aligned */}
        <div style={{ marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ textAlign: "center", minWidth: 200 }}>
            <div style={{ height: 48 }} />
            <div style={{ borderTop: "1px dotted #9ca3af", paddingTop: 4, fontSize: 10 }}>Issued By</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>Enter Computers</div>
          </div>
        </div>

        {/* Footer note — very bottom */}
        <div style={{ textAlign: "center", fontSize: 9, color: "#9ca3af", marginTop: 20, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
          This is a system generated service invoice.
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

// ── Trigger button ─────────────────────────────────────────────────────────
export function PrintServiceButton({
  service,
  className = "",
}: {
  service: ServiceRecord;
  className?: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`rounded-lg border border-purple-300 p-2 text-purple-600 transition-colors hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 ${className}`}
        title="Print Service Invoice"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      </button>
      {showModal && (
        <ServicePrintModal
          service={service}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
