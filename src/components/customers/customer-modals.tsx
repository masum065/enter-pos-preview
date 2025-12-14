"use client";

import { useState } from "react";
import { useCustomerStore, Customer } from "@/stores/customerStore";
import { isValidBDPhone } from "@/lib/utils";
import { Modal, ModalFooter } from "@/components/ui/modal";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded?: (customer: Customer) => void;
}

export function AddCustomerModal({
  isOpen,
  onClose,
  onCustomerAdded,
}: AddCustomerModalProps) {
  const { addCustomer } = useCustomerStore();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    nid: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", address: "", nid: "", notes: "" });
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    } else if (!isValidBDPhone(formData.phone)) {
      newErrors.phone = "Invalid BD phone number (01XXXXXXXXX)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const newCustomer = addCustomer({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      nid: formData.nid.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });

    resetForm();
    onCustomerAdded?.(newCustomer);
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Customer" size="md">
      <div className="space-y-4 text-left">
        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-800 dark:text-white ${
              errors.name ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-primary dark:border-gray-700"
            }`}
            placeholder="Customer name"
            autoFocus
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-800 dark:text-white ${
              errors.phone ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-primary dark:border-gray-700"
            }`}
            placeholder="01XXXXXXXXX"
          />
          {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
        </div>

        {/* Email & NID Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              NID
            </label>
            <input
              type="text"
              value={formData.nid}
              onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="National ID"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Address
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Customer address"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Additional notes..."
          />
        </div>
      </div>

      <ModalFooter
        onCancel={handleClose}
        onConfirm={handleSubmit}
        cancelText="Cancel"
        confirmText="Add Customer"
      />
    </Modal>
  );
}

// Edit Customer Modal
interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onCustomerUpdated?: (customer: Customer) => void;
}

export function EditCustomerModal({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated,
}: EditCustomerModalProps) {
  const { updateCustomer } = useCustomerStore();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    nid: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when customer changes
  useState(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || "",
        nid: customer.nid || "",
        notes: customer.notes || "",
      });
    }
  });

  // Reset form with customer data when modal opens
  const initForm = () => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || "",
        nid: customer.nid || "",
        notes: customer.notes || "",
      });
    }
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    } else if (!isValidBDPhone(formData.phone)) {
      newErrors.phone = "Invalid BD phone number (01XXXXXXXXX)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!customer || !validate()) return;

    updateCustomer(customer.id, {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      nid: formData.nid.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });

    onClose();
  };

  // Initialize form when customer changes or modal opens
  if (isOpen && customer && formData.name !== customer.name) {
    initForm();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Customer" size="md">
      <div className="space-y-4 text-left">
        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-800 dark:text-white ${
              errors.name ? "border-red-500" : "border-gray-300 focus:border-primary dark:border-gray-700"
            }`}
            placeholder="Customer name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-800 dark:text-white ${
              errors.phone ? "border-red-500" : "border-gray-300 focus:border-primary dark:border-gray-700"
            }`}
            placeholder="01XXXXXXXXX"
          />
          {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
        </div>

        {/* Email & NID Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              NID
            </label>
            <input
              type="text"
              value={formData.nid}
              onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="National ID"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Address
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Customer address"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Additional notes..."
          />
        </div>
      </div>

      <ModalFooter
        onCancel={onClose}
        onConfirm={handleSubmit}
        cancelText="Cancel"
        confirmText="Update Customer"
      />
    </Modal>
  );
}
