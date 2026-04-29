"use client";

import { useState, Suspense , useEffect} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDeleteExpense, useExpenses, useUpdateExpense } from "@/hooks/useExpenses";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { ToastNotification } from "@/components/ui/toast";
import { useToast } from "@/hooks/useToast";
import { useCreateExpense } from "@/hooks/useExpenses";
import { ExpenseFormFields, ExpenseFormData } from "@/components/expenses/expense-form";
import { ConfirmModal } from "@/components/ui/confirm-modal";

const CATEGORIES = ["Rent", "Utilities", "Salary", "Transport", "Food", "Repairs", "Marketing", "Supplies", "Miscellaneous"];

interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  description: string;
  amount: string;
  date: string;
  paymentMethod: string;
  paidBy: string;
  receipt?: string;
  notes?: string;
  [key: string]: any;
}

// Add Expense Modal
function AddExpenseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const createExpense = useCreateExpense();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<ExpenseFormData>({
    date: new Date().toISOString().split("T")[0],
    category: "Miscellaneous",
    description: "",
    paymentMethod: "Cash",
    amount: 0,
    paidBy: "Admin",
    receipt: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: new Date().toISOString().split("T")[0],
        category: "Miscellaneous",
        description: "",
        paymentMethod: "Cash",
        amount: 0,
        paidBy: "Admin",
        receipt: "",
        notes: "",
      });
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.category || !formData.category.trim()) newErrors.category = "Category is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (formData.amount <= 0) newErrors.amount = "Amount must be greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    createExpense.mutate({
      date: formData.date,
      category: formData.category,
      description: formData.description.trim(),
      paymentMethod: formData.paymentMethod,
      amount: formData.amount,
      paidBy: formData.paidBy.trim(),
      receipt: formData.receipt.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    } as any, {
      onSuccess: () => {
        showToast("Expense created successfully.");
        onClose();
      },
      onError: () => {
        showToast("Failed to create expense.", "error");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Expense" size="lg">
      <ExpenseFormFields
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        isPending={createExpense.isPending}
      />
      <ModalFooter
        onCancel={onClose}
        onConfirm={handleSubmit}
        cancelText="Cancel"
        confirmText="Add Expense"
        confirmVariant="danger"
        isLoading={createExpense.isPending}
        confirmDisabled={createExpense.isPending}
      />
    </Modal>
  );
}

// Edit Expense Modal
function EditExpenseModal({ isOpen, onClose, expense }: { isOpen: boolean; onClose: () => void; expense: Expense | null }) {
  const updateExpense = useUpdateExpense();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<ExpenseFormData>({
    date: "",
    category: "",
    description: "",
    paymentMethod: "Cash",
    amount: 0,
    paidBy: "",
    receipt: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && expense) {
      setFormData({
        date: new Date(expense.date).toISOString().split("T")[0],
        category: expense.category,
        description: expense.description,
        paymentMethod: expense.paymentMethod as any,
        amount: parseFloat(expense.amount),
        paidBy: expense.paidBy,
        receipt: expense.receipt || "",
        notes: expense.notes || "",
      });
      setErrors({});
    }
  }, [isOpen, expense]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.category || !formData.category.trim()) newErrors.category = "Category is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (formData.amount <= 0) newErrors.amount = "Amount must be greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!expense || !validate()) return;

    updateExpense.mutate({
      id: expense.id,
      data: {
        date: formData.date,
        category: formData.category,
        description: formData.description.trim(),
        paymentMethod: formData.paymentMethod,
        amount: formData.amount,
        paidBy: formData.paidBy.trim(),
        receipt: formData.receipt.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      } as any,
    }, {
      onSuccess: () => {
        showToast("Expense updated successfully.");
        onClose();
      },
      onError: () => {
        showToast("Failed to update expense.", "error");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Expense: ${expense?.expenseNumber}`} size="lg">
      <ExpenseFormFields
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        isPending={updateExpense.isPending}
      />
      <ModalFooter
        onCancel={onClose}
        onConfirm={handleSubmit}
        cancelText="Cancel"
        confirmText="Update Expense"
        confirmVariant="primary"
        isLoading={updateExpense.isPending}
        confirmDisabled={updateExpense.isPending}
      />
    </Modal>
  );
}

// View Expense Modal
function ViewExpenseModal({ isOpen, onClose, expense, onEdit }: { isOpen: boolean; onClose: () => void; expense: Expense | null; onEdit: (e: Expense) => void }) {
  if (!expense) return null;

  const infoItems = [
    { label: "Expense Number", value: expense.expenseNumber, icon: "text-orange-600" },
    { label: "Category", value: expense.category, badge: true },
    { label: "Date", value: formatDate(expense.date) },
    { label: "Amount", value: formatCurrency(parseFloat(expense.amount)), highlight: true },
    { label: "Paid By", value: expense.paidBy },
    { label: "Payment Method", value: expense.paymentMethod },
    { label: "Receipt/Ref", value: expense.receipt || "N/A" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Expense Details" size="md">
      <div className="space-y-6 py-2">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {infoItems.map((item, idx) => (
            <div key={idx} className={item.highlight ? "col-span-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50" : ""}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</p>
              <div className="mt-1 flex items-center gap-2">
                {item.badge ? (
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {item.value}
                  </span>
                ) : (
                  <p className={`text-sm font-semibold ${item.highlight ? "text-xl text-orange-600 dark:text-orange-400" : "text-gray-900 dark:text-white"}`}>
                    {item.value}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {expense.description && (
          <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{expense.description}</p>
          </div>
        )}

        {expense.notes && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</p>
            <p className="mt-1 text-sm italic text-gray-600 dark:text-gray-400">{expense.notes}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Close
          </button>
          <button
            onClick={() => { onClose(); onEdit(expense); }}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 shadow-sm"
          >
            Edit Expense
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ExpensesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = parseInt(searchParams.get("page") || "1");
  const activeSearch = searchParams.get("search") || "";

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };

  // ── Local UI state (no router.push — no reload) ───────────────────────────
  const [searchInput, setSearchInput] = useState(activeSearch);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const deleteExpense = useDeleteExpense();
  const { toast, showToast } = useToast();

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditModal(true);
    setShowViewModal(false);
  };

  const handleView = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowViewModal(true);
  };

  const handleDelete = (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (expense) {
      setSelectedExpense(expense);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = () => {
    if (!selectedExpense) return;
    deleteExpense.mutate(selectedExpense.id, {
      onSuccess: () => {
        showToast("Expense deleted successfully.");
        setShowDeleteModal(false);
        setSelectedExpense(null);
      },
      onError: (err: any) => {
        showToast(err.message || "Failed to delete expense.", "error");
      },
    });
  };

  // Compute startDate/endDate from dateFilter
  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: today.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
    }
    if (dateFilter === "week") {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      return { startDate: weekAgo.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
    }
    if (dateFilter === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: monthStart.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
    }
    if (dateFilter === "custom") {
      return { startDate: dateFrom || undefined, endDate: dateTo || undefined };
    }
    return {};
  };

  const { startDate, endDate } = getDateRange();

  const { data: expensesData, isLoading, isFetching } = useExpenses({
    page,
    limit: 20,
    search: activeSearch || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    startDate,
    endDate,
  });

  const expenses: Expense[] = (expensesData?.expenses || []) as any[];
  const pagination = (expensesData as any)?.pagination;
  const apiStats = (expensesData as any)?.stats;
  const apiCategoryBreakdown = (expensesData as any)?.categoryBreakdown || [];

  // ── Search handlers ───────────────────────────────────────────────────────
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

  // True initial load only
  if (isLoading && !expensesData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-600 dark:text-gray-400">Track and manage business expenses</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:shadow-xl"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
          <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(apiStats?.thisMonthAmount ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(apiStats?.todayAmount ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Showing</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{pagination?.total ?? expenses.length}</p>
          <p className="mt-1 text-sm text-gray-500">records</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Filter Total</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(apiStats?.filteredAmount ?? 0)}</p>
        </div>
      </div>

      {/* Category Breakdown — progress bar style, date-aware */}
      {apiCategoryBreakdown.length > 0 && (() => {
        const maxTotal = Math.max(...apiCategoryBreakdown.map((c: any) => Number(c.total)));
        const CATEGORY_COLORS: Record<string, string> = {
          Rent:          "bg-rose-500",
          Utilities:     "bg-blue-500",
          Salary:        "bg-purple-500",
          Transport:     "bg-amber-500",
          Food:          "bg-green-500",
          Repairs:       "bg-cyan-500",
          Marketing:     "bg-pink-500",
          Supplies:      "bg-indigo-500",
          Miscellaneous: "bg-gray-500",
        };
        const getCategoryColor = (cat: string) => CATEGORY_COLORS[cat] ?? "bg-orange-500";

        return (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Category Breakdown
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({dateFilter === "today" ? "Today" : dateFilter === "week" ? "This Week" : dateFilter === "month" ? "This Month" : dateFilter === "custom" ? "Custom Range" : "All Time"})
                </span>
              </h3>
              {categoryFilter !== "all" && (
                <button
                  onClick={() => setCategoryFilter("all")}
                  className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400"
                >
                  ✕ {categoryFilter}
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              {apiCategoryBreakdown.map(({ category, total, count }: { category: string; total: string; count: number }) => {
                const amount = Number(total);
                const pct = maxTotal > 0 ? Math.round((amount / maxTotal) * 100) : 0;
                const isActive = categoryFilter === category;
                const barColor = getCategoryColor(category);

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategoryFilter(isActive ? "all" : category)}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border p-3.5 transition-all ${
                      isActive
                        ? "border-orange-400 bg-orange-50 shadow-md ring-1 ring-orange-400/20 dark:border-orange-500 dark:bg-orange-900/20"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${barColor}`} />
                          <span className={`truncate text-xs font-bold uppercase tracking-wider ${
                            isActive ? "text-orange-700 dark:text-orange-300" : "text-gray-500 dark:text-gray-400"
                          }`}>
                            {category}
                          </span>
                        </div>
                        <p className={`mt-1 text-lg font-black ${
                          isActive ? "text-orange-600 dark:text-orange-400" : "text-gray-900 dark:text-white"
                        }`}>
                          {formatCurrency(amount)}
                        </p>
                      </div>
                      <span className="flex-shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {count} items
                      </span>
                    </div>

                    {/* Compact progress bar at the bottom */}
                    <div className="mt-auto">
                      <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-gray-400">
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor} ${isActive ? "opacity-100" : "opacity-60 group-hover:opacity-80"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Date Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {(["today", "week", "month", "all", "custom"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-all ${
                dateFilter === filter
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {filter === "all" ? "All Time" : filter === "month" ? "This Month" : filter === "week" ? "This Week" : filter === "custom" ? "Custom" : "Today"}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        {dateFilter === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        )}

        {/* Server-side Search */}
        <form onSubmit={handleSearch} className="relative flex-1">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search description, category, paid by..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-24 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
            {activeSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="rounded-md bg-orange-600 px-3 py-1 text-xs font-medium text-white hover:bg-orange-700"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Expenses Table */}
      <div className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
        {isFetching && (
          <div className="absolute right-4 top-4 z-10">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Expense #</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                <th className="hidden px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white md:table-cell">Method</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {activeSearch
                      ? `No expenses found for "${activeSearch}"`
                      : "No expenses found for this period."}
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr 
                    key={expense.id} 
                    onClick={() => handleView(expense)}
                    className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-orange-600 dark:text-orange-400">{expense.expenseNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
                      <p className="text-sm text-gray-500">Paid by: {expense.paidBy}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(expense.date)}
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-gray-600 dark:text-gray-400 md:table-cell">
                      {expense.paymentMethod}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(parseFloat(expense.amount))}</span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Edit / View Details"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Modals */}
      <AddExpenseModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <EditExpenseModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        expense={selectedExpense} 
      />
      <ViewExpenseModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        expense={selectedExpense}
        onEdit={handleEdit}
      />
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete expense ${selectedExpense?.expenseNumber}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteExpense.isPending}
      />

      <ToastNotification toast={toast} />
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      }
    >
      <ExpensesPageContent />
    </Suspense>
  );
}
