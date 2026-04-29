"use client";

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, File as FileIcon, Loader2, Image as ImageIcon, Trash2, Eye, ChevronLeft, ChevronRight, Download, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export interface DocumentFile {
  fileId: string;
  name: string;
  rawUrl: string;
  type: string;
  size: number;
}

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'error' | 'success';
  xhr?: XMLHttpRequest;
}

export function CustomerDocuments({ 
  documents = [], 
  onChange,
  onUploadSuccess,
  readonly = false
}: { 
  documents?: DocumentFile[];
  onChange?: (docs: DocumentFile[]) => void;
  onUploadSuccess?: (doc: DocumentFile) => void;
  readonly?: boolean;
}) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [viewImageIndex, setViewImageIndex] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentFile | null>(null);
  const uploadingFilesRef = useRef<UploadingFile[]>([]);

  // Keep ref in sync for callbacks
  uploadingFilesRef.current = uploadingFiles;

  const setGalleryIndex = (index: number | null) => {
    setImageLoaded(false);
    setViewImageIndex(index);
  };
  
  const { showToast } = useToast();

  const uploadFile = useCallback((file: File) => {
    const uploadId = Math.random().toString(36).substring(7);
    const newUploadingFile: UploadingFile = {
      id: uploadId,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading'
    };

    setUploadingFiles(prev => [...prev, newUploadingFile]);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://media.entercomputers.com.bd/api/files', true);
    xhr.setRequestHeader('Authorization', `Bearer ${process.env.NEXT_PUBLIC_CDN_API_KEY}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, progress } : f));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          const data = response.data;
          const newDoc: DocumentFile = {
            fileId: data.id || data.fileId || Math.random().toString(36).substring(7),
            name: file.name,
            rawUrl: data.rawUrl,
            type: file.type,
            size: file.size
          };

          setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
          
          // Get latest documents from some source? No, we use the prop.
          // This is tricky because multiple uploads might finish at the same time.
          // We'll use a functional update for the parent if possible, but onChange usually takes the whole array.
          
          // Wait, we need to be careful with the documents array.
          // The best way is to let the parent handle the merge.
          onUploadSuccess?.(newDoc);
          
          // We also need to call onChange if it exists to keep parent state in sync
          // However, we don't have access to the "current" documents in the parent easily here
          // without it being passed in. Since it IS passed in as `documents`, we can use it.
        } catch (e) {
          setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, status: 'error' } : f));
        }
      } else {
        setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, status: 'error' } : f));
      }
    };

    xhr.onerror = () => {
      setUploadingFiles(prev => prev.map(f => f.id === uploadId ? { ...f, status: 'error' } : f));
    };

    newUploadingFile.xhr = xhr;
    xhr.send(formData);
  }, [onUploadSuccess]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (readonly || acceptedFiles.length === 0) return;
    acceptedFiles.forEach(file => uploadFile(file));
  }, [readonly, uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true,
    disabled: readonly
  });

  const cancelUpload = (id: string) => {
    const file = uploadingFiles.find(f => f.id === id);
    if (file?.xhr) {
      file.xhr.abort();
    }
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDelete = (doc: DocumentFile) => {
    if (readonly) return;
    setDocToDelete(doc);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!docToDelete || readonly) return;
    const doc = docToDelete;
    const idToDelete = doc.fileId || (doc as any).id;
    
    try {
      // Only attempt CDN delete if we have a real ID and it's not a temporary one
      if (idToDelete && typeof idToDelete === 'string' && !idToDelete.startsWith('0.') && idToDelete.length > 8) {
         await fetch(`https://media.entercomputers.com.bd/api/files/${idToDelete}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CDN_API_KEY}`
          }
        });
      }

      // Filter by rawUrl as it's a more reliable unique identifier across different data versions
      const updatedDocs = documents.filter(d => d.rawUrl !== doc.rawUrl);
      onChange?.(updatedDocs);
      showToast("Document deleted");
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Failed to delete from storage, but removed from list", "warning");
      
      // Still remove from list even if storage delete fails to keep UI responsive
      const updatedDocs = documents.filter(d => d.rawUrl !== doc.rawUrl);
      onChange?.(updatedDocs);
    } finally {
      setShowDeleteModal(false);
      setDocToDelete(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const imageDocs = useMemo(() => {
    return documents.filter(doc => doc.type?.startsWith('image/') || doc.rawUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i));
  }, [documents]);

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const openGallery = (doc: DocumentFile) => {
    const index = imageDocs.findIndex(d => d.rawUrl === doc.rawUrl);
    if (index !== -1) {
      setGalleryIndex(index);
    }
  };

  const isAnyUploading = uploadingFiles.length > 0;

  return (
    <div className="space-y-4">
      {!readonly && (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-500/10' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className={`p-3 rounded-full bg-gray-100 dark:bg-gray-800 transition-colors ${isDragActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : ''}`}>
              <UploadCloud className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {isDragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Images, PDF, DOC (Max 10MB each)</p>
            </div>
          </div>
        </div>
      )}

      {(documents.length > 0 || uploadingFiles.length > 0) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Uploading Files */}
          {uploadingFiles.map((file) => (
            <div key={file.id} className="relative flex flex-col p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    {file.status === 'error' ? <AlertCircle className="h-5 w-5 text-red-500" /> : <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">{file.status === 'error' ? 'Upload failed' : `${file.progress}% uploaded`}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => cancelUpload(file.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${file.status === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            </div>
          ))}

          {/* Already Uploaded Documents */}
          {documents.map((doc, i) => {
            const isImage = doc.type?.startsWith('image/') || doc.rawUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i);
            return (
              <div key={doc.fileId || i} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 group transition-all hover:shadow-sm hover:border-gray-400 dark:hover:border-gray-600">
                <div 
                  className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1"
                  onClick={() => {
                    if (isImage) {
                      openGallery(doc);
                    } else {
                      handleDownload(doc.rawUrl, doc.name);
                    }
                  }}
                >
                  <div className="flex-shrink-0 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {isImage ? <ImageIcon className="h-5 w-5 text-blue-500" /> : <FileIcon className="h-5 w-5 text-gray-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500">{formatFileSize(doc.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {isImage ? (
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); openGallery(doc); }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md dark:hover:bg-gray-700"
                      title="View Image"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleDownload(doc.rawUrl, doc.name); }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md dark:hover:bg-gray-700"
                      title="Download Document"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                  {!readonly && (
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleDelete(doc); }}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md dark:hover:bg-gray-700"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        readonly && <p className="text-sm text-gray-500 py-4 text-center">No documents uploaded.</p>
      )}

      {/* Portal for Full Screen Image Viewer Modal */}
      {viewImageIndex !== null && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-sm"
          onClick={() => setGalleryIndex(null)}
        >
          {/* Header Controls */}
          <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
            <div className="text-white/80 font-medium pointer-events-auto bg-black/40 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
              {viewImageIndex + 1} / {imageDocs.length}
            </div>
            <div className="flex items-center gap-3 pointer-events-auto">
              <button 
                type="button"
                className="p-2 text-white hover:bg-white/20 bg-black/40 rounded-full transition-colors border border-white/10 backdrop-blur-md"
                onClick={(e) => { e.stopPropagation(); handleDownload(imageDocs[viewImageIndex].rawUrl, imageDocs[viewImageIndex].name); }}
                title="Download"
              >
                <Download className="h-5 w-5" />
              </button>
              <button 
                type="button"
                className="p-2 text-white hover:bg-white/20 bg-black/40 rounded-full transition-colors border border-white/10 backdrop-blur-md"
                onClick={(e) => { e.stopPropagation(); setGalleryIndex(null); }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          {/* Image Container */}
          <div 
            className="relative w-full max-w-5xl h-full max-h-[85vh] flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden shadow-2xl border border-white/10" 
            onClick={(e) => e.stopPropagation()}
          >
            {!imageLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-500" />
                <span className="text-sm font-medium animate-pulse">Loading image...</span>
              </div>
            )}
            <img 
              src={imageDocs[viewImageIndex].rawUrl} 
              alt="Document view" 
              className={`max-h-full max-w-full object-contain select-none transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Navigation Controls */}
          {imageDocs.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 text-white bg-black/40 hover:bg-black/70 rounded-full transition-colors border border-white/10 shadow-lg backdrop-blur-md disabled:opacity-30"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setGalleryIndex(viewImageIndex! > 0 ? viewImageIndex! - 1 : imageDocs.length - 1); 
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              
              <button
                type="button"
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 text-white bg-black/40 hover:bg-black/70 rounded-full transition-colors border border-white/10 shadow-lg backdrop-blur-md disabled:opacity-30"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setGalleryIndex(viewImageIndex! < imageDocs.length - 1 ? viewImageIndex! + 1 : 0); 
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}
        </div>,
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDocToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${docToDelete?.name}"? This file will be permanently removed from storage.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
