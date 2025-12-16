"use client";

import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showDivider?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showDivider = true,
  className,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  // Mount check for SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen || !mounted) return null;

  const sizeClasses = {
    sm: "max-w-[400px]",
    md: "max-w-[550px]",
    lg: "max-w-[700px]",
    xl: "max-w-[900px]",
  };

  const modalContent = (
    <div role="presentation" className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div
        className="animate-fade-in fixed inset-0 z-[9999] bg-[rgba(94,93,93,0.25)] backdrop-blur-sm"
        role="presentation"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={cn(
          "animate-zoom-in fixed left-[50%] top-[50%] z-[10000] -translate-x-1/2 -translate-y-1/2",
          "max-h-[90vh] w-full overflow-y-auto rounded-[15px] bg-white shadow-3",
          "dark:bg-gray-dark dark:shadow-card",
          "max-sm:max-w-[90vw]",
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Close modal"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        {title && (
          <div className="px-8 pt-8 md:px-10 md:pt-10">
            <h3
              id="modal-title"
              className="text-xl font-bold text-dark dark:text-white sm:text-2xl"
            >
              {title}
            </h3>
            {showDivider && (
              <span className="mt-4 block h-[3px] w-22.5 rounded-[2px] bg-primary" />
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-8 py-6 md:px-10 md:py-8">{children}</div>
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }

        .animate-zoom-in {
          animation: zoomIn 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );

  // Use portal to render modal at document.body level
  // This ensures it's above all other elements regardless of parent stacking contexts
  return createPortal(modalContent, document.body);
}

// Modal Footer Component for consistent button layout
interface ModalFooterProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  isLoading?: boolean;
  confirmDisabled?: boolean;
}

export function ModalFooter({
  onCancel,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  isLoading = false,
  confirmDisabled = false,
}: ModalFooterProps) {
  return (
    <div className="-mx-2.5 flex flex-wrap gap-y-4 pt-4">
      {onCancel && (
        <div className="w-full px-2.5 2xsm:w-1/2">
          <button
            type="button"
            onClick={onCancel}
            className="block w-full rounded-[7px] border border-stroke bg-gray-2 p-[11px] text-center font-medium text-dark transition hover:border-gray-3 hover:bg-gray-3 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:border-dark-4 dark:hover:bg-dark-4"
          >
            {cancelText}
          </button>
        </div>
      )}
      {onConfirm && (
        <div className={cn("w-full px-2.5", onCancel ? "2xsm:w-1/2" : "")}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
            className="block w-full rounded-[7px] border border-primary bg-primary p-[11px] text-center font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      )}
    </div>
  );
}
