"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useServices, useUpdateServiceStatus } from "@/hooks/useServices";
import { apiClient } from "@/lib/api-client";
import { Pagination } from "@/components/ui/pagination";
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
  status: string;
  paymentStatus: string;
  totalCost: string;
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

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = parseInt(searchParams.get("page") || "1");
  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };
  const { data: servicesData, isLoading } = useServices({ page, limit: 20 });
  const services: ServiceRecord[] = (servicesData?.services || []) as any[];
  const pagination = (servicesData as any)?.pagination;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | "All">("All");

  // Filtered services
  const filteredServices = useMemo(() => {
    let result = [...services];

    if (statusFilter !== "All") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.serviceNumber.toLowerCase().includes(query) ||
          s.customerName.toLowerCase().includes(query) ||
          s.customerPhone.includes(query) ||
          s.deviceModel.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [services, statusFilter, searchQuery]);

  // Status counts from API (all data, not just current page)
  const apiStats = (servicesData as any)?.stats;
  const statusCounts: Record<string, number> = apiStats?.statusCounts || (() => {
    const counts: Record<string, number> = { All: services.length };
    STATUS_OPTIONS.slice(1).forEach((status) => {
      counts[status] = services.filter((s) => s.status === status).length;
    });
    return counts;
  })();

  // Quick status update
  const handleStatusChange = async (serviceId: string, newStatus: ServiceStatus) => {
    await apiClient.patch(`/api/services/${serviceId}`, { action: "updateStatus", status: newStatus });
  };

  const pendingCount = apiStats?.pendingCount ?? services.filter(s => s.status !== "Completed" && s.status !== "Delivered").length;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          {STATUS_OPTIONS.slice(0, 5).map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === status
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {status} {status !== "All" && `(${statusCounts[status] || 0})`}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search services..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {filteredServices.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
            <p className="text-gray-500">No services found.</p>
          </div>
        ) : (
          filteredServices.map((service) => (
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
                    <p className="text-sm text-gray-500">{service.problemDescription}</p>
                  </div>
                </div>

                {/* Dates & Cost */}
                <div className="flex items-center gap-6">
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
                    {STATUS_OPTIONS.slice(1).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
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
