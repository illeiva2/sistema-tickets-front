import React, { useState } from "react";
import { Button, Badge } from "@/components/ui";
import {
  Download,
  Eye,
  X,
  File,
  Image,
  FileText,
  Code,
  Archive,
} from "lucide-react";
import { API_URL } from "../lib/api";

interface FilePreviewProps {
  attachment: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storageUrl: string;
    previewInfo?: {
      type: string;
      canPreview: boolean;
      icon: string;
      metadata?: Record<string, any>;
    };
    displayInfo?: {
      displayName: string;
      size: string;
      type: string;
    };
  };
  onDelete?: (id: string) => void;
  showActions?: boolean;
  className?: string;
}

// Iconos por tipo de archivo
const getFileIcon = (type: string) => {
  switch (type) {
    case "image":
      return <Image size={20} className="text-blue-500" />;
    case "document":
      return <FileText size={20} className="text-green-500" />;
    case "code":
      return <Code size={20} className="text-purple-500" />;
    case "archive":
      return <Archive size={20} className="text-orange-500" />;
    default:
      return <File size={20} className="text-gray-500" />;
  }
};

// Formatear tamaño de archivo
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const FilePreview: React.FC<FilePreviewProps> = ({
  attachment,
  onDelete,
  showActions = true,
  className = "",
}) => {
  const [showPreview, setShowPreview] = useState(false);

  const fileType = attachment.previewInfo?.type || "other";
  const canPreview = attachment.previewInfo?.canPreview || false;
  const displayName =
    attachment.displayInfo?.displayName || attachment.fileName;
  const size =
    attachment.displayInfo?.size || formatFileSize(attachment.sizeBytes);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `${API_URL}${attachment.storageUrl}`;
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = () => {
    if (canPreview) {
      setShowPreview(true);
    } else {
      // Para archivos que no se pueden previsualizar, abrir en nueva pestaña
      window.open(`${API_URL}${attachment.storageUrl}`, "_blank");
    }
  };

  return (
    <div className={`border rounded-lg p-4 bg-card ${className}`}>
      {/* Información del archivo */}
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">{getFileIcon(fileType)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h4
              className="font-medium text-sm truncate"
              title={attachment.fileName}
            >
              {displayName}
            </h4>
            <Badge
              variant="secondary"
              className="px-3 py-1 text-sm font-medium"
            >
              {fileType}
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Tamaño: {size}</p>
            <p>Tipo: {attachment.mimeType}</p>
            {attachment.previewInfo?.metadata && (
              <div className="space-y-1">
                {Object.entries(attachment.previewInfo.metadata).map(
                  ([key, value]) => (
                    <p key={key}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}:{" "}
                      {String(value)}
                    </p>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        {showActions && (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreview}
              title={canPreview ? "Vista previa" : "Abrir archivo"}
            >
              <Eye size={16} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              title="Descargar"
            >
              <Download size={16} />
            </Button>

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(attachment.id)}
                title="Eliminar"
                className="text-destructive hover:text-destructive"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Vista previa modal para imágenes */}
      {showPreview && canPreview && fileType === "image" && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-4xl p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(false)}
              className="absolute top-2 right-2 text-white hover:bg-white/20"
            >
              <X size={20} />
            </Button>

            <img
              src={`${API_URL}${attachment.storageUrl}`}
              alt={attachment.fileName}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FilePreview;
