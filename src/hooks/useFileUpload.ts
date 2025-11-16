import { useState, useCallback, useRef } from "react";
import api from "../lib/api";
import toast from "react-hot-toast";

export interface FileUploadState {
  isDragging: boolean;
  isUploading: boolean;
  progress: number;
  files: File[];
  error: string | null;
}

export interface FileUploadOptions {
  maxFiles?: number;
  maxSize?: number; // en bytes
  allowedTypes?: string[];
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  onProgress?: (progress: number) => void;
}

export const useFileUpload = (options: FileUploadOptions = {}) => {
  const [state, setState] = useState<FileUploadState>({
    isDragging: false,
    isUploading: false,
    progress: 0,
    files: [],
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validar archivo individual
  const validateFile = useCallback(
    (file: File): string | null => {
      const { maxSize, allowedTypes } = options;

      if (maxSize && file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        return `El archivo ${file.name} excede el tamaño máximo de ${maxSizeMB}MB`;
      }

      if (allowedTypes && allowedTypes.length > 0) {
        const isValidType = allowedTypes.some(
          (type) =>
            file.type.startsWith(type) ||
            file.name.toLowerCase().endsWith(type),
        );
        if (!isValidType) {
          return `Tipo de archivo no permitido: ${file.name}`;
        }
      }

      return null;
    },
    [options],
  );

  // Validar múltiples archivos
  const validateFiles = useCallback(
    (files: File[]): string | null => {
      const { maxFiles } = options;

      if (maxFiles && files.length > maxFiles) {
        return `Máximo ${maxFiles} archivos permitidos`;
      }

      for (const file of files) {
        const error = validateFile(file);
        if (error) return error;
      }

      return null;
    },
    [options, validateFile],
  );

  // Manejar drag & drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState((prev) => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setState((prev) => ({ ...prev, isDragging: false }));

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setState((prev) => ({ ...prev, files }));
    }
  }, []);

  // Seleccionar archivos manualmente
  const selectFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        setState((prev) => ({ ...prev, files }));
      }
    },
    [],
  );

  // Subir archivos
  const uploadFiles = useCallback(
    async (ticketId: string) => {
      if (state.files.length === 0) {
        toast.error("No hay archivos para subir");
        return;
      }

      const error = validateFiles(state.files);
      if (error) {
        setState((prev) => ({ ...prev, error }));
        toast.error(error);
        return;
      }

      setState((prev) => ({
        ...prev,
        isUploading: true,
        progress: 0,
        error: null,
      }));

      try {
        const results = [];

        for (let i = 0; i < state.files.length; i++) {
          const file = state.files[i];
          const formData = new FormData();
          formData.append("file", file);

          // Simular progreso
          const progress = Math.round(((i + 1) / state.files.length) * 100);
          setState((prev) => ({ ...prev, progress }));

          const response = await api.post(
            `/api/attachments/${ticketId}`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );

          if (response.data.success) {
            results.push(response.data.data);
          }

          // Notificar progreso
          options.onProgress?.(progress);
        }

        setState((prev) => ({
          ...prev,
          isUploading: false,
          progress: 100,
          files: [],
        }));

        toast.success(`${results.length} archivo(s) subido(s) correctamente`);
        options.onSuccess?.(results);
      } catch (error: any) {
        const message =
          error.response?.data?.error?.message || "Error al subir archivos";
        setState((prev) => ({
          ...prev,
          isUploading: false,
          progress: 0,
          error: message,
        }));

        toast.error(message);
        options.onError?.(error);
      }
    },
    [state.files, validateFiles, options],
  );

  // Limpiar archivos
  const clearFiles = useCallback(() => {
    setState((prev) => ({
      ...prev,
      files: [],
      error: null,
      progress: 0,
    }));
  }, []);

  // Remover archivo específico
  const removeFile = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  }, []);

  return {
    ...state,
    fileInputRef,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    selectFiles,
    handleFileSelect,
    uploadFiles,
    clearFiles,
    removeFile,
  };
};
