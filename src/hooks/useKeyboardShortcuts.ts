"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: "Navigation" | "Actions" | "General";
  action: () => void;
}

/**
 * All shortcuts use Alt (Option on Mac) to avoid conflicts with
 * browser defaults (Ctrl+N / Cmd+N = new tab, etc.).
 * Alt+key works consistently on both Mac and Windows.
 */
export function getModifierLabel() {
  return "Alt";
}

export function useKeyboardShortcuts(options?: { toggleFullscreen?: () => void }) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts: Shortcut[] = [
    // Navigation — Alt+key
    {
      key: "d",
      alt: true,
      description: "Go to Dashboard",
      category: "Navigation",
      action: () => router.push("/"),
    },
    {
      key: "1",
      alt: true,
      description: "Sales History",
      category: "Navigation",
      action: () => router.push("/sales"),
    },
    {
      key: "2",
      alt: true,
      description: "Customers",
      category: "Navigation",
      action: () => router.push("/customers"),
    },
    {
      key: "3",
      alt: true,
      description: "Products",
      category: "Navigation",
      action: () => router.push("/inventory/products"),
    },
    {
      key: "4",
      alt: true,
      description: "Stock",
      category: "Navigation",
      action: () => router.push("/inventory/stock"),
    },
    {
      key: "5",
      alt: true,
      description: "Services",
      category: "Navigation",
      action: () => router.push("/services"),
    },
    // Actions — Alt+key
    {
      key: "n",
      alt: true,
      description: "New Invoice",
      category: "Actions",
      action: () => router.push("/sales/new"),
    },
    {
      key: "i",
      alt: true,
      description: "Add Stock",
      category: "Actions",
      action: () => router.push("/inventory/stock/add"),
    },
    {
      key: "e",
      alt: true,
      description: "Add Expense",
      category: "Actions",
      action: () => router.push("/expenses/new"),
    },
    {
      key: "j",
      alt: true,
      description: "New Service",
      category: "Actions",
      action: () => router.push("/services/new"),
    },
    {
      key: "f",
      alt: true,
      description: "Toggle Browser Fullscreen",
      category: "Actions",
      action: () => options?.toggleFullscreen?.(),
    },
    // General — no modifier
    {
      key: "/",
      description: "Focus search on current page",
      category: "General",
      action: () => {
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[data-search="true"], input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
    },
    {
      key: "?",
      shift: true,
      description: "Show keyboard shortcuts",
      category: "General",
      action: () => setShowHelp(true),
    },
    {
      key: "Escape",
      description: "Close modal / clear search",
      category: "General",
      action: () => {
        setShowHelp(false);
        const active = document.activeElement as HTMLElement;
        if (active) active.blur();
      },
    },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept when typing in input/textarea (except Escape and ?)
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isTyping && e.key !== "Escape") return;

      for (const shortcut of shortcuts) {
        // Alt matching
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        // Ctrl/Cmd matching
        const ctrlMatch = shortcut.ctrl
          ? (e.ctrlKey || e.metaKey)
          : (!e.ctrlKey && !e.metaKey);
        // Shift matching
        const shiftMatch = shortcut.shift ? e.shiftKey : true;

        // On Mac, Option+key produces special chars (e.g. Option+N = ñ)
        // so we use e.code (physical key) for Alt-based shortcuts
        let keyMatch = false;
        if (shortcut.alt) {
          // Map shortcut key to physical key code
          const keyCode = shortcut.key.length === 1
            ? (shortcut.key >= '0' && shortcut.key <= '9'
              ? `Digit${shortcut.key}`
              : `Key${shortcut.key.toUpperCase()}`)
            : shortcut.key;
          keyMatch = e.code === keyCode;
        } else {
          keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        }

        if (keyMatch && altMatch && ctrlMatch && shiftMatch) {
          e.preventDefault();
          e.stopPropagation();
          shortcut.action();
          return;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, showHelp]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts,
    showHelp,
    setShowHelp,
  };
}
