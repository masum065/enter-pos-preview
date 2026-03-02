"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/assets/icons";

interface SearchResult {
  id: string;
  type: "customer" | "invoice" | "stock";
  primary: string;
  secondary: string;
  href: string;
}

function typeLabel(type: SearchResult["type"]) {
  if (type === "customer") return { label: "Customer", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
  if (type === "invoice") return { label: "Invoice", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" };
  return { label: "Stock", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" };
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node) &&
          !dropdownRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut: / or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "/" || (e.ctrlKey && e.key === "k")) && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [custRes, salesRes, stockRes] = await Promise.allSettled([
        fetch(`/api/customers?search=${encodeURIComponent(q)}&limit=3`).then(r => r.json()),
        fetch(`/api/sales?search=${encodeURIComponent(q)}&limit=3`).then(r => r.json()),
        fetch(`/api/stock?search=${encodeURIComponent(q)}&limit=3`).then(r => r.json()),
      ]);

      const all: SearchResult[] = [];

      if (custRes.status === "fulfilled") {
        (custRes.value?.customers || []).forEach((c: any) => all.push({
          id: c.id, type: "customer",
          primary: c.name, secondary: c.phone,
          href: `/customers`,
        }));
      }
      if (salesRes.status === "fulfilled") {
        (salesRes.value?.sales || []).forEach((s: any) => all.push({
          id: s.id, type: "invoice",
          primary: s.invoiceNumber || `INV-${s.id.slice(0, 6)}`,
          secondary: `${s.customerName} • ৳${parseFloat(s.grandTotal || 0).toLocaleString()}`,
          href: `/sales`,
        }));
      }
      if (stockRes.status === "fulfilled") {
        const items = stockRes.value?.stockItems || [];
        items.forEach((entry: any) => {
          const item = entry.stockItem || entry;
          all.push({
            id: item.id, type: "stock",
            primary: item.serialNumber,
            secondary: item.status,
            href: `/inventory/stock`,
          });
        });
      }

      setResults(all);
      setIsOpen(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setActive(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) { setResults([]); setIsOpen(false); return; }
    debounceRef.current = setTimeout(() => search(v), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    router.push(result.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && active >= 0) { e.preventDefault(); handleSelect(results[active]); }
    if (e.key === "Escape") { setIsOpen(false); }
  };

  return (
    <div className="relative w-full max-w-[300px]">
      {/* Input */}
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={handleChange}
        onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder="Search customers, invoices, stock…"
        autoComplete="off"
        className="flex w-full items-center gap-3.5 rounded-full border bg-gray-2 py-3 pl-[53px] pr-5 outline-none transition-colors focus-visible:border-primary dark:border-dark-3 dark:bg-dark-2 dark:hover:border-dark-4 dark:hover:bg-dark-3 dark:hover:text-dark-6 dark:focus-visible:border-primary text-sm"
      />
      {/* Icon */}
      {loading ? (
        <svg className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-gray-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <SearchIcon className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 max-[1015px]:size-5" />
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <ul>
              {results.map((r, i) => {
                const { label, color } = typeLabel(r.type);
                return (
                  <li key={r.id + r.type}>
                    <button
                      onClick={() => handleSelect(r)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${active === i ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                    >
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900 dark:text-white text-sm">{r.primary}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{r.secondary}</p>
                      </div>
                      <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 dark:border-gray-800">
            <kbd className="rounded border border-gray-200 px-1 dark:border-gray-700">↑</kbd>
            <kbd className="ml-1 rounded border border-gray-200 px-1 dark:border-gray-700">↓</kbd>
            <span className="ml-1">navigate</span>
            <kbd className="ml-3 rounded border border-gray-200 px-1 dark:border-gray-700">Enter</kbd>
            <span className="ml-1">select</span>
            <kbd className="ml-3 rounded border border-gray-200 px-1 dark:border-gray-700">Esc</kbd>
            <span className="ml-1">close</span>
          </div>
        </div>
      )}
    </div>
  );
}
