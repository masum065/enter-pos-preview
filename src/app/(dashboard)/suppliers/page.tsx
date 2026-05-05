"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useSuppliers, useSupplier, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, supplierKeys } from "@/hooks/useSuppliers";
import { SupplierFormFields, SupplierFormData } from "@/components/suppliers/supplier-form";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { ToastNotification } from "@/components/ui/toast";
import { useToast } from "@/hooks/useToast";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SupplierDocuments } from "@/components/suppliers/supplier-documents";
import { AddSupplierModal } from "@/components/suppliers/modals";
import { FileText, MapPin, Phone, Mail, Calendar, CreditCard, ArrowUpRight, ArrowDownRight, User, Settings, Eye } from "lucide-react";

interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  balance: string;
  totalPurchases: string;
  totalPaid: string;
  createdAt: string;
  updatedAt: string;
  documents?: any[];
}


// Edit Supplier Modal (kept for inline edit; Add is now a separate page)
function EditSupplierModal({
  isOpen, onClose, supplier, onSave, isPending = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSave: (data: Partial<Supplier>) => void;
  isPending?: boolean;
}) {
  const [formData, setFormData] = useState<SupplierFormData>({ companyName: "", phone: "", email: "", address: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && supplier) {
      setFormData({
        companyName: supplier.companyName,
        phone: supplier.phone,
        email: supplier.email || "",
        address: supplier.address || "",
        notes: supplier.notes || "",
      });
      setErrors({});
    }
  }, [isOpen, supplier]);

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave({
      companyName: formData.companyName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });
    // Do NOT call onClose() here — let the parent close on mutation success
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Supplier" size="md">
      <SupplierFormFields 
        formData={formData} 
        setFormData={setFormData} 
        errors={errors} 
        isPending={isPending} 
      />
      <ModalFooter
        onCancel={onClose}
        onConfirm={handleSubmit}
        cancelText="Cancel"
        confirmText="Update"
        isLoading={isPending}
        confirmDisabled={isPending}
      />
    </Modal>
  );
}

// Payment Modal
function PaymentModal({ isOpen, onClose, supplier, onPay, isPending = false }: {
  isOpen: boolean; onClose: () => void; supplier: Supplier | null;
  onPay: (amount: number, reference?: string) => void;
  isPending?: boolean;
}) {
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState("");
  useEffect(() => {
    if (isOpen && supplier) { setAmount(Math.max(0, parseFloat(supplier.balance))); setReference(""); }
  }, [isOpen, supplier]);
  if (!supplier) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="sm">
      <div className="space-y-4 text-left">
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">Paying to</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{supplier.companyName}</p>
          <div className="mt-2 flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Balance</span>
            <span className={`font-bold ${parseFloat(supplier.balance) > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(Math.abs(parseFloat(supplier.balance)))} {parseFloat(supplier.balance) > 0 ? "(Due)" : "(Advance)"}
            </span>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Amount</label>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white" min={0} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Reference (Optional)</label>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Transaction ID, Check No..." />
        </div>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={() => { if (amount > 0) { onPay(amount, reference || undefined); } }}
        cancelText="Cancel" confirmText="Record Payment" confirmVariant="primary"
        isLoading={isPending} confirmDisabled={isPending} />
    </Modal>
  );
}

// Supplier Detail Modal Component
function SupplierDetailModal({
  supplier: initialSupplier,
  isOpen,
  onClose,
  onEdit,
}: {
  supplier: Supplier;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: supplierDetail } = useSupplier(initialSupplier.id);
  const supplier = supplierDetail || initialSupplier;

  const stats = useMemo(() => ({
    totalPurchases: parseFloat(supplier.totalPurchases || '0'),
    totalPaid: parseFloat(supplier.totalPaid || '0'),
    balance: parseFloat(supplier.balance || '0'),
  }), [supplier]);

  const handleDocumentsChange = async (updatedDocs: any[]) => {
    try {
      await apiClient.put(`/api/suppliers/${supplier.id}`, {
        companyName: supplier.companyName,
        phone: supplier.phone,
        documents: updatedDocs
      });
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    } catch (error) {
      showToast("Failed to update documents", "error");
    }
  };

  const handleUploadSuccess = async (newDoc: any) => {
    const currentDocs = supplier.documents || [];
    await handleDocumentsChange([...currentDocs, newDoc]);
    showToast("Document uploaded successfully");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Supplier Profile" size="xl">
      <div className="flex flex-col gap-6">
        {/* Header Profile Info */}
        <div className="flex flex-col md:flex-row gap-6 p-1 border-b border-gray-100 dark:border-gray-800 pb-6">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-lg shadow-blue-500/20">
            {supplier.companyName?.charAt(0).toUpperCase() || "S"}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{supplier.companyName}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                stats.balance > 0 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {stats.balance > 0 ? 'Due Balance' : 'Advance Payment'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {formatPhone(supplier.phone)}</div>
              {supplier.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {supplier.email}</div>}
              <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Since {formatDate(supplier.createdAt)}</div>
            </div>
          </div>
          <div className="flex flex-wrap md:flex-col gap-2">
            <button 
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
            >
              <Settings className="h-4 w-4" /> Edit Profile
            </button>
            <Link 
              href={`/suppliers/ledger?id=${supplier.id}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <CreditCard className="h-4 w-4" /> View Ledger
            </Link>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Purchases</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalPurchases)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Paid</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Current Balance</p>
            <p className={`text-lg font-bold ${stats.balance > 0 ? 'text-red-600' : 'text-blue-600'}`}>
              {formatCurrency(Math.abs(stats.balance))} {stats.balance > 0 ? '(Due)' : '(Adv)'}
            </p>
          </div>
        </div>

        {/* Tabs & Content */}
        <div className="flex flex-col gap-4 min-h-[400px]">
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            <button 
              onClick={() => setIsDocumentsOpen(false)}
              className={`px-6 py-3 text-sm font-semibold transition-colors relative ${!isDocumentsOpen ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Supplier Details
              {!isDocumentsOpen && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setIsDocumentsOpen(true)}
              className={`px-6 py-3 text-sm font-semibold transition-colors relative flex items-center gap-2 ${isDocumentsOpen ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Documents
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">
                {supplier.documents?.length || 0}
              </span>
              {isDocumentsOpen && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
          </div>

          <div className="py-2">
            {isDocumentsOpen ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Attached Documents</h3>
                  <p className="text-xs text-gray-500 italic">Images and PDFs only</p>
                </div>
                <SupplierDocuments 
                  documents={supplier.documents || []}
                  onChange={handleDocumentsChange}
                  onUploadSuccess={handleUploadSuccess}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <MapPin className="h-3 w-3" /> Address Information
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/30 p-3 rounded-lg border border-gray-100 dark:border-gray-800 min-h-[80px]">
                      {supplier.address || "No address provided"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <FileText className="h-3 w-3" /> Internal Notes
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/30 p-3 rounded-lg border border-gray-100 dark:border-gray-800 min-h-[80px]">
                      {supplier.notes || "No notes available for this supplier"}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</h3>
                   <div className="grid grid-cols-1 gap-2">
                      <button 
                        onClick={onEdit}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                            <Settings className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Update Information</p>
                            <p className="text-xs text-gray-500">Edit company details, phone, etc.</p>
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </button>

                      <Link 
                        href={`/suppliers/ledger?id=${supplier.id}`}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Financial Ledger</p>
                            <p className="text-xs text-gray-500">View transaction history and due</p>
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                      </Link>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
        <button 
          onClick={onClose}
          className="px-6 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
        >
          Close Profile
        </button>
      </div>
    </Modal>
  );
}

function SuppliersPageContent() {
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const router = useRouter();

  const page = parseInt(searchParams.get("page") || "1");
  const activeSearch = searchParams.get("search") || "";

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };

  // Local state — no router.push, no reload
  const [searchInput, setSearchInput] = useState(activeSearch);
  const [balanceFilter, setBalanceFilter] = useState<"all" | "due" | "clear" | "advance">("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast, showToast } = useToast();

  const { data: suppliersData, isLoading, isFetching } = useSuppliers({
    page,
    limit: 20,
    search: activeSearch || undefined,
    balanceFilter: balanceFilter !== "all" ? balanceFilter : undefined,
  });

  const suppliers: Supplier[] = (suppliersData?.suppliers || []) as any[];
  const pagination = (suppliersData as any)?.pagination;
  const apiStats = (suppliersData as any)?.stats;

  // Server-side search
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const query = searchInput.trim();
    if (query) { params.set("search", query); params.delete("page"); }
    else params.delete("search");
    router.push(`?${params.toString()}`);
  };

  const clearSearch = () => {
    setSearchInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search"); params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const handleUpdate = (data: Partial<Supplier>) => {
    if (selectedSupplier) {
      updateSupplierMutation.mutate({ 
        id: selectedSupplier.id, 
        data: {
          ...data,
          documents: selectedSupplier.documents || []
        } as any 
      }, {
        onSuccess: () => { setShowEditModal(false); showToast(`"${selectedSupplier.companyName}" updated.`); },
        onError: () => showToast("Failed to update supplier.", "error"),
      });
    }
  };

  const handleDelete = () => {
    if (selectedSupplier) {
      deleteSupplierMutation.mutate(selectedSupplier.id, {
        onSuccess: () => { setShowDeleteConfirm(false); showToast(`"${selectedSupplier.companyName}" deleted.`); setSelectedSupplier(null); },
        onError: () => showToast("Failed to delete supplier.", "error"),
      });
    }
  };

  const paymentMutation = useMutation({
    mutationFn: ({ supplierId, amount, reference }: { supplierId: string, amount: number, reference?: string }) =>
      apiClient.post(`/api/suppliers/${supplierId}/payments`, { amount, reference }),
    onSuccess: (_, variables) => {
      // Optimistically update the cached supplier list data for instant UI feedback
      queryClient.setQueriesData(
        { queryKey: supplierKeys.lists() },
        (oldData: any) => {
          if (!oldData?.suppliers) return oldData;
          return {
            ...oldData,
            suppliers: oldData.suppliers.map((s: any) => {
              if (s.id === variables.supplierId) {
                const newBalance = parseFloat(s.balance) - variables.amount;
                const newTotalPaid = parseFloat(s.totalPaid) + variables.amount;
                return {
                  ...s,
                  balance: newBalance.toFixed(2),
                  totalPaid: newTotalPaid.toFixed(2),
                };
              }
              return s;
            }),
            stats: oldData.stats ? {
              ...oldData.stats,
              totalPayable: Math.max(0, (parseFloat(oldData.stats.totalPayable) || 0) - variables.amount).toFixed(2),
            } : oldData.stats,
          };
        }
      );
      // Also refetch to get the real server data
      queryClient.refetchQueries({ queryKey: supplierKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierKeys.detail(variables.supplierId) });
      setShowPaymentModal(false);
      showToast("Payment recorded successfully.");
    },
    onError: () => {
      showToast("Failed to record payment.", "error");
    }
  });

  const handlePayment = (amount: number, reference?: string) => {
    if (selectedSupplier) {
      paymentMutation.mutate({ supplierId: selectedSupplier.id, amount, reference });
    }
  };

  if (isLoading && !suppliersData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
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
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:shadow-xl"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Suppliers</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{apiStats?.total ?? 0}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">With Due Balance</p>
          <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">{apiStats?.withDue ?? 0}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Payable</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(apiStats?.totalPayable ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Purchased</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(apiStats?.totalPurchases ?? 0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Balance Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {(["all", "due", "clear", "advance"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setBalanceFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-all ${
                balanceFilter === f
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {f === "all" ? "All" : f === "due" ? "Has Due" : f === "clear" ? "Cleared" : "Advance"}
            </button>
          ))}
        </div>

        {/* Server-Side Search */}
        <form onSubmit={handleSearch} className="relative flex-1">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, phone, email, address..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-24 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
            {activeSearch && (
              <button type="button" onClick={clearSearch}
                className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
            )}
            <button type="submit"
              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700">Search</button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
        {isFetching && (
          <div className="absolute right-4 top-4 z-10">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Supplier</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Contact</th>
                <th className="hidden px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white lg:table-cell">Total Purchases</th>
                <th className="hidden px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white md:table-cell">Total Paid</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Balance</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {activeSearch ? `No suppliers found for "${activeSearch}"` : "No suppliers found."}
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/10"
                    onClick={() => { setSelectedSupplier(supplier); setShowDetailModal(true); }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                          {supplier.companyName?.charAt(0).toUpperCase() || "S"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{supplier.companyName}</p>
                          {supplier.address && <p className="truncate text-xs text-gray-400 max-w-[180px]">{supplier.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 dark:text-white">{formatPhone(supplier.phone)}</p>
                      {supplier.email && <p className="text-xs text-gray-500">{supplier.email}</p>}
                    </td>
                    <td className="hidden px-6 py-4 text-right font-medium text-gray-900 dark:text-white lg:table-cell">
                      {formatCurrency(parseFloat(supplier.totalPurchases))}
                    </td>
                    <td className="hidden px-6 py-4 text-right font-medium text-green-600 dark:text-green-400 md:table-cell">
                      {formatCurrency(parseFloat(supplier.totalPaid))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                        parseFloat(supplier.balance) > 0
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : parseFloat(supplier.balance) < 0
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {parseFloat(supplier.balance) > 0
                          ? `${formatCurrency(parseFloat(supplier.balance))} Due`
                          : parseFloat(supplier.balance) < 0
                          ? `${formatCurrency(Math.abs(parseFloat(supplier.balance)))} Advance`
                          : "Clear"}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setSelectedSupplier(supplier); setShowDetailModal(true); }}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20" title="View Profile">
                          <Eye className="h-4 w-4" />
                        </button>
                        <Link href={`/suppliers/ledger?id=${supplier.id}`}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20" title="View Ledger">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </Link>
                        {parseFloat(supplier.balance) > 0 && (
                          <button onClick={() => { setSelectedSupplier(supplier); setShowPaymentModal(true); }}
                            className="rounded-lg p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20" title="Make Payment">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button onClick={() => { setSelectedSupplier(supplier); setShowEditModal(true); }}
                          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" title="Edit">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => { setSelectedSupplier(supplier); setShowDeleteConfirm(true); }}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" title="Delete">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}

      {/* Add Modal */}
      <AddSupplierModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Supplier Detail Modal (Profile & Documents) */}
      {selectedSupplier && (
        <SupplierDetailModal
          supplier={selectedSupplier}
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setSelectedSupplier(null); }}
          onEdit={() => { setShowDetailModal(false); setShowEditModal(true); }}
        />
      )}

      {/* Edit Modal */}
      <EditSupplierModal isOpen={showEditModal} onClose={() => setShowEditModal(false)}
        supplier={selectedSupplier} onSave={handleUpdate}
        isPending={updateSupplierMutation.isPending} />

      {/* Payment Modal */}
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)}
        supplier={selectedSupplier} onPay={handlePayment} isPending={paymentMutation.isPending} />

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${selectedSupplier?.companyName}"? This will delete all transaction history and ledger records. This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteSupplierMutation.isPending}
      />

      <ToastNotification toast={toast} />
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>}>
      <SuppliersPageContent />
    </Suspense>
  );
}
