"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useServices } from "@/hooks/useServices";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Pagination } from "@/components/ui/pagination";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { PrintServiceButton } from "@/components/invoice/service-print";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";

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
  totalCost: string;
  serviceCharge: string;
  partsCost: string;
  paidAmount: string;
  dueAmount: string;
  receivedDate: string;
  expectedDeliveryDate: string | null;
  createdAt: string;
  [key: string]: any;
}

type ServiceStatus = "Received" | "Diagnosing" | "Waiting for Parts" | "In Progress" | "Completed" | "Delivered";

const STATUS_OPTIONS: (ServiceStatus | "All")[] = [
  "All", "Received", "Diagnosing", "Waiting for Parts", "In Progress", "Completed", "Delivered"
];

// ================================================
// SERVICE EDIT MODAL
// ================================================
function ServiceEditModal({
  service,
  onClose,
  onSaved,
}: {
  service: ServiceRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialProblems = service.problemDescription
    ? service.problemDescription.split("\n").filter(p => p.trim())
    : [""];

  const [problems, setProblems] = useState<string[]>(initialProblems.length > 0 ? initialProblems : [""]);
  const [serviceCharge, setServiceCharge] = useState(parseFloat(service.serviceCharge) || 0);
  const [partsCost, setPartsCost] = useState(parseFloat(service.partsCost) || 0);
  const [diagnosis, setDiagnosis] = useState(service.diagnosis || "");
  const [technicianNotes, setTechnicianNotes] = useState(service.technicianNotes || "");
  const [status, setStatusLocal] = useState(service.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalCost = serviceCharge + partsCost;
  const currentPaid = parseFloat(service.paidAmount) || 0;
  const newDue = Math.max(0, totalCost - currentPaid);

  const addProblem = () => setProblems([...problems, ""]);
  const removeProblem = (index: number) => {
    if (problems.length <= 1) return;
    setProblems(problems.filter((_, i) => i !== index));
  };
  const updateProblem = (index: number, value: string) => {
    const updated = [...problems];
    updated[index] = value;
    setProblems(updated);
  };

  const handleSave = async () => {
    const validProblems = problems.filter(p => p.trim());
    if (validProblems.length === 0) {
      setError("At least one problem is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updates: Record<string, any> = {
        problemDescription: validProblems.join("\n"),
        serviceCharge: serviceCharge.toFixed(2),
        partsCost: partsCost.toFixed(2),
        totalCost: totalCost.toFixed(2),
        dueAmount: newDue.toFixed(2),
        diagnosis: diagnosis || null,
        technicianNotes: technicianNotes || null,
        status,
      };

      // Auto-set payment status based on new costs
      if (totalCost <= 0) {
        updates.paymentStatus = "Paid";
        updates.dueAmount = "0.00";
      } else if (currentPaid >= totalCost) {
        updates.paymentStatus = "Paid";
        updates.dueAmount = "0.00";
      } else if (currentPaid > 0) {
        updates.paymentStatus = "Partial";
      } else {
        updates.paymentStatus = "Pending";
      }

      // Auto-set dates on status
      if (status === "Completed" && service.status !== "Completed") {
        updates.completedDate = new Date().toISOString();
      }
      if (status === "Delivered" && service.status !== "Delivered") {
        updates.deliveredDate = new Date().toISOString();
      }

      await apiClient.put(`/api/services/${service.id}`, updates);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit Service ${service.serviceNumber}`} size="lg">
      <p className="-mt-4 mb-4 text-sm text-gray-500">{service.customerName} &bull; {service.deviceBrand} {service.deviceModel}</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}

      <div className="space-y-5">
        {/* Status */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
          <select
            value={status}
            onChange={(e) => setStatusLocal(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {STATUS_OPTIONS.slice(1).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Problems List */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Problems / Issues</label>
          <div className="space-y-2">
            {problems.map((problem, index) => (
              <div key={index} className="flex gap-2">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-sm font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={problem}
                  onChange={(e) => updateProblem(index, e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder={index === 0 ? "e.g. Screen not working" : "Another problem..."}
                />
                {problems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProblem(index)}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addProblem} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Problem
          </button>
        </div>

        {/* Diagnosis */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Diagnosis</label>
          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="What was found after inspection..."
          />
        </div>

        {/* Costs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Service Charge (৳)</label>
            <input
              type="number"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              min="0"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Parts Cost (৳)</label>
            <input
              type="number"
              value={partsCost}
              onChange={(e) => setPartsCost(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              min="0"
            />
          </div>
        </div>

        {/* Cost Summary */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Service Charge</span>
            <span>৳{serviceCharge.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Parts Cost</span>
            <span>৳{partsCost.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-lg font-bold dark:border-gray-700">
            <span>Total</span>
            <span>৳{totalCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Paid</span>
            <span className="text-green-600">৳{currentPaid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span className="text-gray-500">Due</span>
            <span className={newDue > 0 ? "text-red-600" : "text-green-600"}>৳{newDue.toLocaleString()}</span>
          </div>
        </div>

        {/* Technician Notes */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Technician Notes</label>
          <textarea
            value={technicianNotes}
            onChange={(e) => setTechnicianNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Internal notes for technician..."
          />
        </div>
      </div>

      {/* Footer */}
      <ModalFooter
        onCancel={onClose}
        onConfirm={handleSave}
        cancelText="Cancel"
        confirmText={saving ? "Saving..." : "Save Changes"}
        isLoading={saving}
      />
    </Modal>
  );
}

// ================================================
// SERVICES LIST PAGE
// ================================================
function ServicesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const page = parseInt(searchParams.get("page") || "1");
  const activeSearch = searchParams.get("search") || "";
  const activeStatus = searchParams.get("status") || "";

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };

  const { data: servicesData, isLoading } = useServices({
    page, limit: 20,
    search: activeSearch || undefined,
    status: activeStatus || undefined,
  });
  const services: ServiceRecord[] = (servicesData?.services || []) as any[];
  const pagination = (servicesData as any)?.pagination;

  // Edit modal state
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);

  // URL-based search
  const [searchInput, setSearchInput] = useState(activeSearch);
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const query = searchInput.trim();
    if (query) {
      params.set("search", query);
      params.delete("page");
    } else {
      params.delete("search");
    }
    router.push(`?${params.toString()}`);
  };
  const clearSearch = () => {
    setSearchInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  // URL-based status filter
  const setStatus = (s: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (s === "All" || s === "") {
      params.delete("status");
    } else {
      params.set("status", s);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const apiStats = (servicesData as any)?.stats;
  const statusCounts: Record<string, number> = apiStats?.statusCounts || (() => {
    const counts: Record<string, number> = { All: services.length };
    STATUS_OPTIONS.slice(1).forEach((status) => {
      counts[status] = services.filter((s) => s.status === status).length;
    });
    return counts;
  })();

  const handleStatusChange = async (serviceId: string, newStatus: ServiceStatus) => {
    await apiClient.patch(`/api/services/${serviceId}`, { action: "updateStatus", status: newStatus });
    queryClient.invalidateQueries({ queryKey: ["services"] });
  };

  const pendingCount = apiStats?.pendingCount ?? services.filter(s => s.status !== "Completed" && s.status !== "Delivered").length;

  const renderProblems = (desc: string) => {
    const items = desc.split("\n").filter(p => p.trim());
    if (items.length <= 1) return <p className="text-sm text-gray-500">{desc}</p>;
    return (
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-gray-500">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Edit Modal */}
      {editingService && (
        <ServiceEditModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["services"] })}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Track device repairs and services</p>
        </div>
        <Link
          href="/services/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 font-medium text-white shadow-lg"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Service
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 p-5 text-white shadow-lg">
          <p className="text-sm text-purple-100">Pending Services</p>
          <p className="mt-1 text-3xl font-bold">{pendingCount}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Received</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{statusCounts["Received"] || 0}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{statusCounts["In Progress"] || 0}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">Ready for Delivery</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{statusCounts["Completed"] || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setStatus(status === "All" ? "" : status)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                (status === "All" && !activeStatus) || activeStatus === status
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {status} {status !== "All" && `(${statusCounts[status] || 0})`}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="relative flex-1">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by service #, customer, device..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-24 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
            {activeSearch && (
              <button type="button" onClick={clearSearch} className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">&#x2715;</button>
            )}
            <button type="submit" className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700">Search</button>
          </div>
        </form>
      </div>

      {/* Active Filters Info */}
      {(activeSearch || activeStatus) && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Found {pagination?.total || services.length} services
          {activeSearch ? ` matching "${activeSearch}"` : ""}
          {activeStatus ? ` — Status: ${activeStatus}` : ""}
        </div>
      )}

      {/* Services List */}
      <div className="space-y-4">
        {services.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
            <p className="text-gray-500">{activeSearch || activeStatus ? "No services found matching filters." : "No services yet."}</p>
          </div>
        ) : (
          services.map((service) => (
            <div
              key={service.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Service Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-purple-600 dark:text-purple-400">{service.serviceNumber}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(service.paymentStatus)}`}>
                      {service.paymentStatus}
                    </span>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{service.customerName}</span>
                    <span className="text-gray-500">{service.customerPhone}</span>
                  </div>

                  <div className="mt-2">
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {service.deviceBrand} {service.deviceModel}
                    </p>
                    {renderProblems(service.problemDescription)}
                  </div>
                </div>

                {/* Dates & Cost & Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p className="text-gray-500">Received: {formatDate(service.receivedDate)}</p>
                    {service.expectedDeliveryDate && (
                      <p className="text-gray-500">Expected: {formatDate(service.expectedDeliveryDate)}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Cost</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(parseFloat(service.totalCost))}</p>
                    {parseFloat(service.dueAmount) > 0 && (
                      <p className="text-sm text-red-600">Due: {formatCurrency(parseFloat(service.dueAmount))}</p>
                    )}
                  </div>

                  {/* Quick Status Update */}
                  <select
                    value={service.status}
                    onChange={(e) => handleStatusChange(service.id, e.target.value as ServiceStatus)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {STATUS_OPTIONS.slice(1).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Print Button */}
                  <PrintServiceButton service={service} />

                  {/* Edit Button */}
                  <button
                    onClick={() => setEditingService(service)}
                    className="rounded-lg border border-purple-300 p-2 text-purple-600 transition-colors hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
                    title="Edit service"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div></div>}>
      <ServicesPageContent />
    </Suspense>
  );
}
