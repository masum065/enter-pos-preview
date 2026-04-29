"use client";

import { useState, useEffect, useRef } from "react";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { isValidBDPhone } from "@/lib/utils";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { CustomerDocuments, DocumentFile } from "@/components/customers/customer-documents";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded?: (customer: any) => void;
  defaultName?: string;
  defaultPhone?: string;
}

export function AddCustomerModal({
  isOpen,
  onClose,
  onCustomerAdded,
  defaultName = "",
  defaultPhone = "",
}: AddCustomerModalProps) {
  const createCustomer = useCreateCustomer();
  const [formData, setFormData] = useState({
    name: defaultName,
    phone: defaultPhone,
    email: "",
    address: "",
    nid: "",
    notes: "",
    documents: [] as DocumentFile[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const sessionUploadedFileIds = useRef<string[]>([]);

  // Sync form with default values when modal opens or defaults change
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: defaultName,
        phone: defaultPhone,
        email: "",
        address: "",
        nid: "",
        notes: "",
        documents: [],
      });
      setErrors({});
      sessionUploadedFileIds.current = [];
    }
  }, [isOpen, defaultName, defaultPhone]);

  const cleanupUnsavedFiles = async () => {
    const idsToDelete = sessionUploadedFileIds.current;
    if (idsToDelete.length === 0) return;

    console.log("Cleaning up unsaved files:", idsToDelete);
    // Loop through and delete from CDN
    for (const fileId of idsToDelete) {
      try {
        await fetch(`https://media.entercomputers.com.bd/api/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CDN_API_KEY}`
          }
        });
      } catch (err) {
        console.error(`Failed to cleanup file ${fileId}`, err);
      }
    }
    sessionUploadedFileIds.current = [];
  };

  const resetForm = () => {
    setFormData({ 
      name: defaultName, 
      phone: defaultPhone, 
      email: "", 
      address: "", 
      nid: "", 
      notes: "",
      documents: []
    });
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

    createCustomer.mutate({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      nid: formData.nid.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      documents: formData.documents,
    }, {
      onSuccess: (newCustomer) => {
        sessionUploadedFileIds.current = []; // Clear without deleting
        resetForm();
        onCustomerAdded?.(newCustomer);
        onClose();
      },
    });
  };

  const handleClose = () => {
    cleanupUnsavedFiles();
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

        {/* Documents Upload */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Documents
          </label>
          <CustomerDocuments 
            documents={formData.documents} 
            onChange={(docs) => setFormData({ ...formData, documents: docs })} 
            onUploadSuccess={(doc) => {
              sessionUploadedFileIds.current.push(doc.fileId);
              setFormData(prev => ({ ...prev, documents: [...prev.documents, doc] }));
            }}
          />
        </div>
      </div>

      <ModalFooter
        onCancel={handleClose}
        onConfirm={handleSubmit}
        cancelText="Cancel"
        confirmText="Add Customer"
        isLoading={createCustomer.isPending}
        confirmDisabled={createCustomer.isPending}
      />
    </Modal>
  );
}

// Edit Customer Modal
interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any | null;
  onCustomerUpdated?: (customer: any) => void;
}

export function EditCustomerModal({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated,
}: EditCustomerModalProps) {
  const updateCustomer = useUpdateCustomer();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    nid: "",
    notes: "",
    documents: [] as DocumentFile[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const sessionUploadedFileIds = useRef<string[]>([]);

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
        documents: customer.documents || [],
      });
    }
  });

  const cleanupUnsavedFiles = async () => {
    const idsToDelete = sessionUploadedFileIds.current;
    if (idsToDelete.length === 0) return;

    for (const fileId of idsToDelete) {
      try {
        await fetch(`https://media.entercomputers.com.bd/api/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CDN_API_KEY}`
          }
        });
      } catch (err) {
        console.error(`Failed to cleanup file ${fileId}`, err);
      }
    }
    sessionUploadedFileIds.current = [];
  };

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
        documents: customer.documents || [],
      });
    }
    setErrors({});
    sessionUploadedFileIds.current = [];
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

    updateCustomer.mutate({
      id: customer.id,
      data: {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        nid: formData.nid.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        documents: formData.documents,
      },
    }, {
      onSuccess: () => {
        sessionUploadedFileIds.current = []; // Clear without deleting
        onClose();
      },
    });
  };

  const handleClose = () => {
    cleanupUnsavedFiles();
    onClose();
  };

  // Initialize form when customer changes or modal opens
  if (isOpen && customer && formData.name !== customer.name) {
    initForm();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Customer" size="md">
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

        {/* Documents Upload */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Documents
          </label>
          <CustomerDocuments 
            documents={formData.documents} 
            onChange={(docs) => {
              // We need to check if a document was removed that was in sessionUploadedFileIds
              const currentIds = docs.map(d => d.fileId);
              sessionUploadedFileIds.current = sessionUploadedFileIds.current.filter(id => currentIds.includes(id));
              setFormData({ ...formData, documents: docs });
            }}
            onUploadSuccess={(doc) => {
              sessionUploadedFileIds.current.push(doc.fileId);
              setFormData(prev => ({ ...prev, documents: [...prev.documents, doc] }));
            }}
          />
        </div>
      </div>

      <ModalFooter
        onCancel={handleClose}
        onConfirm={handleSubmit}
        cancelText="Cancel"
        confirmText="Update Customer"
        isLoading={updateCustomer.isPending}
        confirmDisabled={updateCustomer.isPending}
      />
    </Modal>
  );
}
