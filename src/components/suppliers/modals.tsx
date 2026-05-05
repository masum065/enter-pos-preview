"use client";

import { useState, useEffect } from "react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { SupplierFormFields, SupplierFormData } from "./supplier-form";
import { useCreateSupplier } from "@/hooks/useSuppliers";
import { useToast } from "@/hooks/useToast";

export function AddSupplierModal({ 
  isOpen, 
  onClose,
  defaultName = "",
  onSupplierAdded
}: { 
  isOpen: boolean; 
  onClose: () => void;
  defaultName?: string;
  onSupplierAdded?: (supplier: any) => void;
}) {
  const createSupplier = useCreateSupplier();
  const [formData, setFormData] = useState<SupplierFormData>({ 
    companyName: defaultName, 
    phone: "", 
    email: "", 
    address: "", 
    notes: "" 
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData({ 
        companyName: defaultName, 
        phone: "", 
        email: "", 
        address: "", 
        notes: "" 
      });
      setErrors({});
    }
  }, [isOpen, defaultName]);

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    createSupplier.mutate({
      companyName: formData.companyName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      documents: [],
    }, {
      onSuccess: (newSupplier) => {
        showToast("Supplier created successfully.");
        onSupplierAdded?.(newSupplier);
        onClose();
      },
      onError: () => {
        showToast("Failed to create supplier.", "error");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Supplier" size="md">
      <SupplierFormFields 
        formData={formData} 
        setFormData={setFormData} 
        errors={errors} 
        isPending={createSupplier.isPending} 
      />
      <ModalFooter
        onCancel={onClose}
        onConfirm={handleSubmit}
        cancelText="Cancel"
        confirmText="Add Supplier"
        isLoading={createSupplier.isPending}
        confirmDisabled={createSupplier.isPending}
      />
    </Modal>
  );
}
