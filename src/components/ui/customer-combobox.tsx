"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useCustomers } from "@/hooks/useCustomers";

export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  [key: string]: any;
}

interface CustomerComboboxProps {
  selectedCustomer: CustomerOption | null;
  onSelect: (customer: CustomerOption | null) => void;
  /** If provided, an "Add New Customer" button will appear when no results found or at the bottom of results */
  onAddNew?: (searchQuery: string) => void;
  placeholder?: string;
}

const MIN_SEARCH_LENGTH = 3;

export function CustomerCombobox({
  selectedCustomer,
  onSelect,
  onAddNew,
  placeholder = "Type 3+ characters to search customer...",
}: CustomerComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shouldSearch = query.trim().length >= MIN_SEARCH_LENGTH;

  // Fetch only when user has typed enough chars to search
  const { data: customersData, isFetching } = useCustomers(
    { search: query.trim(), limit: 10 },
    shouldSearch
  );
  
  const filteredCustomers = shouldSearch ? (customersData?.customers || [] as CustomerOption[]) : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: CustomerOption) => {
    onSelect(customer);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
    inputRef.current?.focus();
  };

  const showDropdown = isOpen && shouldSearch;
  const showNoResults = shouldSearch && filteredCustomers.length === 0 && !isFetching;

  // --- Selected State ---
  if (selectedCustomer) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-lg font-bold text-white">
            {selectedCustomer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {selectedCustomer.name}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedCustomer.phone}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg px-3 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Change
        </button>
      </div>
    );
  }

  // --- Search State ---
  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
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
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Hint */}
      {query.length > 0 && query.length < MIN_SEARCH_LENGTH && (
        <p className="mt-1 text-xs text-gray-500">
          Type {MIN_SEARCH_LENGTH - query.length} more character
          {MIN_SEARCH_LENGTH - query.length > 1 ? "s" : ""} to search...
        </p>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {/* Loading State */}
          {isFetching && (
            <div className="flex flex-col items-center justify-center p-6 text-gray-500">
              <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <p className="text-sm font-medium">Searching customers...</p>
            </div>
          )}

          {/* Results */}
          {!isFetching && filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => handleSelectCustomer(customer)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {customer.name}
                </p>
                <p className="text-sm text-gray-500">{customer.phone}</p>
              </div>
            </button>
          ))}

          {/* No Results */}
          {showNoResults && (
            <div className="p-4 text-center">
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                No customer found for &quot;{query}&quot;
              </p>
              {onAddNew && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAddNew(query);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
                >
                  <svg
                    className="h-4 w-4"
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
                  Add New Customer
                </button>
              )}
            </div>
          )}

          {/* Add New at bottom when results exist */}
          {!isFetching && !showNoResults && filteredCustomers.length > 0 && onAddNew && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddNew(query);
              }}
              className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-blue-600 transition-colors hover:bg-blue-50 dark:border-gray-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
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
              Add New Customer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
