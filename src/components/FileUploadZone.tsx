import React from "react";
import { Button } from "@/components/ui";
import { Upload, X, File, Image, FileText, Code, Archive } from "lucide-react";
import { useFileUpload, FileUploadOptions } from "../hooks/useFileUpload";

interface FileUploadZoneProps extends FileUploadOptions {
  ticketId: string;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  className?: string;
}

// Iconos por tipo de archivo
const getFileIcon = (file: File) => {
  if (file.type.startsWith("image/")) return <Image size={20} />;
  if (file.type.startsWith("text/") || file.type === "application/pdf")
    return <FileText size={20} />;
  if (
    file.type.includes("code") ||
    file.name.match(/\.(py|java|cpp|js|ts|php|rb|go|rs)$/i)
  )
    return <Code size={20} />;
  if (
    file.type.includes("zip") ||
    file.type.includes("rar") ||
    file.type.includes("tar")
  )
    return <Archive size={20} />;
  return <File size={20} />;
};

// Formatear tamaño de archivo
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  ticketId,
  maxFiles = 20,
  maxSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ["image/", "application/pdf", "text/", "application/zip"],
  onSuccess,
  onError,
  className = "",
}) => {
  const {
    isDragging,
    isUploading,
    progress,
    files,
    error,
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
  } = useFileUpload({
    maxFiles,
    maxSize,
    allowedTypes,
    onSuccess,
    onError,
  });

  const handleUpload = () => {
    uploadFiles(ticketId);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Zona de Drag & Drop */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />

        <div className="space-y-2">
          <p className="text-lg font-medium">
            {isDragging ? "Suelta los archivos aquí" : "Arrastra archivos aquí"}
          </p>
          <p className="text-sm text-muted-foreground">
            o{" "}
            <button
              type="button"
              onClick={selectFiles}
              className="text-primary hover:underline font-medium"
            >
              selecciona archivos
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            Máximo {maxFiles} archivos, {Math.round(maxSize / (1024 * 1024))}MB
            por archivo
          </p>
        </div>

        {/* Input de archivos oculto */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept={allowedTypes.join(",")}
        />
      </div>

      {/* Lista de archivos seleccionados */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              Archivos seleccionados ({files.length})
            </h4>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFiles}
                disabled={isUploading}
              >
                Limpiar
              </Button>
              <Button size="sm" onClick={handleUpload} disabled={isUploading}>
                {isUploading ? "Subiendo..." : "Subir Archivos"}
              </Button>
            </div>
          </div>

          {/* Barra de progreso */}
          {isUploading && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Lista de archivos */}
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div className="text-sm">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;
