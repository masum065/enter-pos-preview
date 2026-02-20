"use client";

import { useState, useMemo, useEffect } from "react";
import { useSupplierStore, Supplier } from "@/stores/supplierStore";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { Modal, ModalFooter } from "@/components/ui/modal";
import Link from "next/link";

// Add/Edit Supplier Modal
function SupplierModal({
  isOpen,
  onClose,
  supplier,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSave: (data: Partial<Supplier>) => void;
}) {
  const [formData, setFormData] = useState({
    companyName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setFormData({
          companyName: supplier.companyName,
          phone: supplier.phone,
          email: supplier.email || "",
          address: supplier.address || "",
          notes: supplier.notes || "",
        });
      } else {
        setFormData({ companyName: "", phone: "", email: "", address: "", notes: "" });
      }
      setErrors({});
    }
  }, [isOpen, supplier]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      companyName: formData.companyName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={supplier ? "Edit Supplier" : "Add Supplier"} size="md">
      <div className="space-y-4 text-left">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${
              errors.companyName ? "border-red-500" : "border-gray-300 dark:border-gray-700"
            }`}
            placeholder="Company/Supplier name"
          />
          {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`w-full rounded-lg border px-4 py-2.5 dark:bg-gray-800 dark:text-white ${
                errors.phone ? "border-red-500" : "border-gray-300 dark:border-gray-700"
              }`}
              placeholder="01XXXXXXXXX"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="email@example.com"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Address
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Supplier address"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Additional notes..."
          />
        </div>
      </div>

      <ModalFooter
        onCancel={onClose}
        onConfirm={handleSubmit}
        cancelText="Cancel"
        confirmText={supplier ? "Update" : "Add Supplier"}
      />
    </Modal>
  );
}

// Payment Modal
function PaymentModal({
  isOpen,
  onClose,
  supplier,
  onPay,
}: {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onPay: (amount: number, reference?: string) => void;
}) {
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (isOpen && supplier) {
      setAmount(Math.max(0, supplier.balance));
      setReference("");
    }
  }, [isOpen, supplier]);

  if (!supplier) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="sm">
      <div className="space-y-4 text-left">
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Paying to</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{supplier.companyName || 'Unnamed Supplier'}</p>
          <div className="mt-2 flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Balance</span>
            <span className={`font-bold ${supplier.balance > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(Math.abs(supplier.balance))} {supplier.balance > 0 ? "(Payable)" : "(Advance)"}
            </span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Payment Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            min={0}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Reference (Optional)
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Transaction ID, Check No., etc."
          />
        </div>
      </div>

      <ModalFooter
        onCancel={onClose}
        onConfirm={() => {
          if (amount > 0) {
            onPay(amount, reference || undefined);
            onClose();
          }
        }}
        cancelText="Cancel"
        confirmText="Record Payment"
        confirmVariant="primary"
      />
    </Modal>
  );
}

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, recordPayment, getTotalPayable } = useSupplierStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.companyName.toLowerCase().includes(q) ||
        s.phone.includes(q)
    );
  }, [suppliers, searchQuery]);

  const totalPayable = useMemo(() => getTotalPayable(), [suppliers]);

  const handleSave = (data: Partial<Supplier>) => {
    if (selectedSupplier) {
      updateSupplier(selectedSupplier.id, data);
    } else {
      addSupplier(data as Omit<Supplier, "id" | "balance" | "totalPurchases" | "totalPaid" | "createdAt" | "updatedAt">);
    }
  };

  const handleDelete = () => {
    if (selectedSupplier) {
      deleteSupplier(selectedSupplier.id);
      setShowDeleteConfirm(false);
      setSelectedSupplier(null);
    }
  };

  const handlePayment = (amount: number, reference?: string) => {
    if (selectedSupplier) {
      recordPayment(selectedSupplier.id, amount, reference);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suppliers</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your suppliers and their ledger</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSelectedSupplier(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 font-medium text-white shadow-lg hover:shadow-xl"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Supplier
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Suppliers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{suppliers.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Payable</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalPayable)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">With Due Balance</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {suppliers.filter((s) => s.balance > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, phone, or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Suppliers Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Supplier</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Contact</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Total Purchases</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Total Paid</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Balance</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery ? "No suppliers found matching your search" : "No suppliers added yet"}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white">
                          {supplier.companyName?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{supplier.companyName || 'Unnamed Supplier'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 dark:text-white">{formatPhone(supplier.phone)}</p>
                      {supplier.email && <p className="text-sm text-gray-500">{supplier.email}</p>}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(supplier.totalPurchases)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(supplier.totalPaid)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                          supplier.balance > 0
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : supplier.balance < 0
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {supplier.balance > 0
                          ? `${formatCurrency(supplier.balance)} Due`
                          : supplier.balance < 0
                          ? `${formatCurrency(Math.abs(supplier.balance))} Advance`
                          : "Clear"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/suppliers/ledger?id=${supplier.id}`}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          title="View Ledger"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </Link>
                        {supplier.balance > 0 && (
                          <button
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setShowPaymentModal(true);
                            }}
                            className="rounded-lg p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                            title="Make Payment"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setShowModal(true);
                          }}
                          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                          title="Edit"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setShowDeleteConfirm(true);
                          }}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <SupplierModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        supplier={selectedSupplier}
        onSave={handleSave}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        supplier={selectedSupplier}
        onPay={handlePayment}
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Supplier"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Are you sure you want to delete <strong>{selectedSupplier?.companyName}</strong>? This will also delete all transaction history for this supplier.
        </p>
        <ModalFooter
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          cancelText="Cancel"
          confirmText="Delete"
          confirmVariant="danger"
        />
      </Modal>
    </div>
  );
}
