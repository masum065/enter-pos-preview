"use client";

import { Modal, ModalFooter } from "./modal";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "success" | "primary";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
            variant === "danger" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
            variant === "success" ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
            "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          }`}>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {message}
          </p>
        </div>
        
        <ModalFooter
          onCancel={onClose}
          onConfirm={() => {
            onConfirm();
            if (!isLoading) onClose();
          }}
          cancelText={cancelText}
          confirmText={confirmText}
          confirmVariant={variant}
          isLoading={isLoading}
        />
      </div>
    </Modal>
  );
}
