"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCustomers, useDeleteCustomer } from "@/hooks/useCustomers";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, formatPhone, formatCurrency } from "@/lib/utils";
import { AddCustomerModal, EditCustomerModal } from "@/components/customers/customer-modals";
import { Modal, ModalFooter } from "@/components/ui/modal";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nid?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

// Customer Detail Modal Component
function CustomerDetailModal({
  customer,
  onClose,
  onEdit,
}: {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
}) {
  // No sales data available yet from API, show empty stats
  const stats = useMemo(() => {
    return { totalPurchases: 0, totalSpent: 0, totalDue: 0 };
  }, []);

  return (
    <Modal isOpen={true} onClose={onClose} title="Customer Details" size="lg">
      <div className="space-y-6 text-left">
        {/* Customer Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{customer.name}</h3>
            <p className="text-lg text-blue-600 dark:text-blue-400">{formatPhone(customer.phone)}</p>
            <p className="text-sm text-gray-500">Customer since {formatDate(customer.createdAt)}</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
            <p className="mt-1 font-medium text-gray-900 dark:text-white">
              {customer.email || "-"}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">NID</p>
            <p className="mt-1 font-mono font-medium text-gray-900 dark:text-white">
              {customer.nid || "-"}
            </p>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
          <p className="mt-1 font-medium text-gray-900 dark:text-white">
            {customer.address || "No address provided"}
          </p>
        </div>

        {/* Notes */}
        {customer.notes && (
          <div className="rounded-xl bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Notes</p>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{customer.notes}</p>
          </div>
        )}

        {/* Purchase Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50 p-4 text-center dark:bg-blue-900/20">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalPurchases}</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">Total Purchases</p>
          </div>
          <div className="rounded-xl bg-green-50 p-4 text-center dark:bg-green-900/20">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalSpent)}</p>
            <p className="text-sm text-green-700 dark:text-green-300">Total Spent</p>
          </div>
          <div className="rounded-xl bg-red-50 p-4 text-center dark:bg-red-900/20">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalDue)}</p>
            <p className="text-sm text-red-700 dark:text-red-300">Outstanding Due</p>
          </div>
        </div>

        {/* Purchase History */}
        <div>
          <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
            Purchase History (0)
          </h4>
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No purchase history yet</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
          {stats.totalDue > 0 && (
            <Link
              href="/sales/due"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
            >
              Collect Due
            </Link>
          )}
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Customer
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CustomersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = parseInt(searchParams.get("page") || "1");
  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };
  const { data: customersData, isLoading } = useCustomers({ page, limit: 20 });
  const deleteCustomerMutation = useDeleteCustomer();

  const customers: Customer[] = (customersData?.customers || []) as any[];
  const pagination = (customersData as any)?.pagination;

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Filtered customers (client-side search on current page)
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (c.email && c.email.toLowerCase().includes(query))
    );
  }, [customers, searchQuery]);

  const totalCustomers = pagination?.total || customers.length;

  const handleDeleteCustomer = () => {
    if (deletingCustomer) {
      deleteCustomerMutation.mutate(deletingCustomer.id, {
        onSuccess: () => {
          setDeletingCustomer(null);
          setShowDeleteModal(false);
        },
      });
    }
  };

  const openDeleteModal = (customer: Customer) => {
    setDeletingCustomer(customer);
    setShowDeleteModal(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  const handleEditFromDetail = () => {
    if (viewingCustomer) {
      setEditingCustomer(viewingCustomer);
      setViewingCustomer(null);
    }
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Customers
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your customer database ({totalCustomers} total)
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <svg
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="Search by name, phone, email..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-gray-900 placeholder-gray-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
        />
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Found {totalCustomers} customers
        </p>
      )}

      {/* Customer Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Phone
                </th>
                <th className="hidden px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white md:table-cell">
                  Address
                </th>
                <th className="hidden px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white lg:table-cell">
                  Added
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    {searchQuery
                      ? "No customers found matching your search."
                      : "No customers yet. Add your first customer!"}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => handleViewCustomer(customer)}
                    className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-semibold text-white">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {customer.name}
                          </p>
                          {customer.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {customer.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatPhone(customer.phone)}
                      </p>
                    </td>
                    <td className="hidden px-6 py-4 md:table-cell">
                      <p className="text-gray-600 dark:text-gray-400">
                        {customer.address || "-"}
                      </p>
                    </td>
                    <td className="hidden px-6 py-4 lg:table-cell">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(customer.createdAt)}
                      </p>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {/* View Button */}
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          title="View Details"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingCustomer(customer)}
                          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                          title="Edit"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={() => openDeleteModal(customer)}
                          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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

      {/* Customer Detail Modal */}
      {viewingCustomer && (
        <CustomerDetailModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          onEdit={handleEditFromDetail}
        />
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        customer={editingCustomer}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingCustomer(null);
        }}
        title="Delete Customer"
        size="sm"
      >
        <div className="text-left">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {deletingCustomer?.name}
            </span>
            ? This action cannot be undone.
          </p>
        </div>
        <ModalFooter
          onCancel={() => {
            setShowDeleteModal(false);
            setDeletingCustomer(null);
          }}
          onConfirm={handleDeleteCustomer}
          cancelText="Cancel"
          confirmText="Delete"
        />
      </Modal>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div></div>}>
      <CustomersPageContent />
    </Suspense>
  );
}
