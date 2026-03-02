"use client";

export function InvoiceActions() {
  return (
    <div
      id="print-btn-bar"
      style={{
        maxWidth: 820,
        margin: "0 auto 12px",
        display: "flex",
        gap: 8,
        justifyContent: "flex-end",
      }}
    >
      <button
        onClick={() => window.close()}
        style={{
          padding: "8px 20px",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          border: "none",
          background: "#e5e7eb",
          color: "#333",
        }}
      >
        ✕ Close
      </button>
      <button
        onClick={() => window.print()}
        style={{
          padding: "8px 20px",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          border: "none",
          background: "#2563eb",
          color: "#fff",
        }}
      >
        🖨️ Print / Save PDF
      </button>
    </div>
  );
}
