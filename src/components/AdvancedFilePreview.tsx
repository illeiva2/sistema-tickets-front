import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  Download,
  Eye,
  X,
  File,
  Image,
  FileText,
  Code,
  Archive,
  Tag,
  Folder,
  Search,
} from "lucide-react";
import api from "../lib/api"; // Added import for api
import toast from "react-hot-toast"; // Added import for toast

interface FileMetadata {
  dimensions?: { width: number; height: number };
  pages?: number;
  size: number;
  lastModified: Date;
  format?: string;
  colorSpace?: string;
  hasAlpha?: boolean;
  orientation?: number;
  dpi?: { x: number; y: number };
}

interface ThumbnailInfo {
  path: string;
  size: { width: number; height: number };
  url: string;
}

interface AdvancedFilePreviewProps {
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
      metadata?: FileMetadata;
      thumbnail?: ThumbnailInfo;
    };
    displayInfo?: {
      displayName: string;
      size: string;
      type: string;
    };
  };
  onDelete?: (id: string) => void;
  onOrganize?: (id: string, data: any) => void;
  showActions?: boolean;
  className?: string;
}

// Iconos por tipo de archivo
const getFileIcon = (type: string) => {
  switch (type) {
    case "image":
      return <Image size={24} className="text-blue-500" />;
    case "document":
      return <FileText size={24} className="text-green-500" />;
    case "code":
      return <Code size={24} className="text-purple-500" />;
    case "archive":
      return <Archive size={24} className="text-orange-500" />;
    default:
      return <File size={24} className="text-gray-500" />;
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

// Formatear fecha
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AdvancedFilePreview: React.FC<AdvancedFilePreviewProps> = ({
  attachment,
  onDelete,
  showActions = true,
  className = "",
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showOrganize, setShowOrganize] = useState(false);
  const [thumbnailBlob, setThumbnailBlob] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<string | null>(null);

  const fileType = attachment.previewInfo?.type || "other";
  const canPreview = attachment.previewInfo?.canPreview || false;
  const displayName =
    attachment.displayInfo?.displayName || attachment.fileName;
  const size =
    attachment.displayInfo?.size || formatFileSize(attachment.sizeBytes);
  const metadata = attachment.previewInfo?.metadata;
  const thumbnail = attachment.previewInfo?.thumbnail;

  // Función para cargar el thumbnail
  const loadThumbnail = useCallback(async () => {
    if (!thumbnail) return;

    try {
      const thumbnailFileName = thumbnail.url.split("/").pop() || "";
      const response = await api.get(
        `/api/thumbnails/${encodeURIComponent(thumbnailFileName)}`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      setThumbnailBlob(url);
    } catch (error) {
      console.error("Error loading thumbnail:", error);
      toast.error("Error al cargar la miniatura");
    }
  }, [thumbnail]);

  // Función para cargar la imagen
  const loadImage = useCallback(async () => {
    try {
      const fileName =
        attachment.storageUrl.split("/").pop() || attachment.fileName;
      const response = await api.get(
        `/api/files/${encodeURIComponent(fileName)}`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      setImageBlob(url);
    } catch (error) {
      console.error("Error loading image:", error);
      toast.error("Error al cargar la imagen");
    }
  }, [attachment.storageUrl, attachment.fileName]);

  // Cargar thumbnail cuando el componente se monte
  useEffect(() => {
    if (thumbnail && !thumbnailBlob) {
      loadThumbnail();
    }
  }, [thumbnail, thumbnailBlob, loadThumbnail]);

  // Cargar imagen cuando se abra la vista previa
  useEffect(() => {
    if (showPreview && canPreview && fileType === "image" && !imageBlob) {
      loadImage();
    }
  }, [showPreview, canPreview, fileType, imageBlob, loadImage]);

  // Cleanup de blobs cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (thumbnailBlob) {
        window.URL.revokeObjectURL(thumbnailBlob);
      }
      if (imageBlob) {
        window.URL.revokeObjectURL(imageBlob);
      }
    };
  }, [thumbnailBlob, imageBlob]);

  const handleDownload = async () => {
    try {
      const response = await api.get(attachment.storageUrl, {
        responseType: "blob",
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Error al descargar el archivo");
    }
  };

  const handlePreview = async () => {
    if (canPreview) {
      setShowPreview(true);
    } else {
      // Para archivos que no se pueden previsualizar, usar estrategias diferentes
      const fileExtension = attachment.fileName.split(".").pop()?.toLowerCase();

      // Para PDFs, intentar abrir en nueva pestaña con la API autenticada
      if (fileExtension === "pdf") {
        try {
          const response = await api.get(attachment.storageUrl, {
            responseType: "blob",
          });

          const blob = new Blob([response.data], { type: "application/pdf" });
          const url = window.URL.createObjectURL(blob);
          window.open(url, "_blank");
          // Limpiar el URL después de un tiempo
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        } catch (error) {
          console.error("Error opening PDF:", error);
          toast.error("Error al abrir el PDF");
        }
      }
      // Para documentos de texto, intentar abrir en nueva pestaña
      else if (
        ["txt", "md", "json", "xml", "csv"].includes(fileExtension || "")
      ) {
        try {
          const response = await api.get(attachment.storageUrl, {
            responseType: "text",
          });

          const blob = new Blob([response.data], { type: "text/plain" });
          const url = window.URL.createObjectURL(blob);
          window.open(url, "_blank");
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        } catch (error) {
          console.error("Error opening text file:", error);
          toast.error("Error al abrir el archivo de texto");
        }
      }
      // Para otros archivos, mostrar mensaje informativo
      else {
        toast.success(
          "Este tipo de archivo no se puede previsualizar. Usa la opción de descarga.",
        );
      }
    }
  };

  const handleThumbnailClick = async () => {
    if (thumbnail) {
      try {
        const thumbnailFileName = thumbnail.url.split("/").pop() || "";
        const response = await api.get(
          `/api/thumbnails/${encodeURIComponent(thumbnailFileName)}`,
          {
            responseType: "blob",
          },
        );

        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        setShowPreview(true);
        // Limpiar el URL después de un tiempo
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } catch (error) {
        console.error("Error opening thumbnail:", error);
        toast.error("Error al abrir la vista previa");
      }
    }
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 min-w-0 w-full">
            {getFileIcon(fileType)}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate" title={displayName}>
                {displayName}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge
                  variant="secondary"
                  className="px-2 py-0.5 text-xs font-medium shrink-0"
                >
                  {fileType}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {size}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center w-full gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 px-0"
              onClick={() => setShowMetadata(!showMetadata)}
              title="Ver metadatos"
            >
              <Search size={16} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 px-0"
              onClick={() => setShowOrganize(!showOrganize)}
              title="Organizar archivo"
            >
              <Folder size={16} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 px-0"
              onClick={handlePreview}
              title="Vista previa"
            >
              <Eye size={16} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 px-0"
              onClick={handleDownload}
              title="Descargar"
            >
              <Download size={16} />
            </Button>

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-8 px-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(attachment.id)}
                title="Eliminar"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Thumbnail */}
        {thumbnail && (
          <div className="flex justify-center">
            <div className="relative group">
              {thumbnailBlob ? (
                <img
                  src={thumbnailBlob}
                  alt={`Vista previa de ${attachment.fileName}`}
                  className="w-32 h-32 object-cover rounded-lg border shadow-sm group-hover:shadow-md transition-shadow"
                />
              ) : (
                <div className="w-32 h-32 bg-gray-200 rounded-lg border flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Cargando...</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleThumbnailClick}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Eye size={20} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Metadatos expandibles */}
        {showMetadata && metadata && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <Tag size={16} />
              <span>Metadatos del archivo</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {metadata.dimensions && (
                <div>
                  <span className="font-medium">Dimensiones:</span>
                  <span className="ml-2 text-muted-foreground">
                    {metadata.dimensions.width} × {metadata.dimensions.height}{" "}
                    px
                  </span>
                </div>
              )}

              {metadata.pages && (
                <div>
                  <span className="font-medium">Páginas:</span>
                  <span className="ml-2 text-muted-foreground">
                    {metadata.pages}
                  </span>
                </div>
              )}

              {metadata.format && (
                <div>
                  <span className="font-medium">Formato:</span>
                  <span className="ml-2 text-muted-foreground">
                    {metadata.format}
                  </span>
                </div>
              )}

              {metadata.colorSpace && (
                <div>
                  <span className="font-medium">Espacio de color:</span>
                  <span className="ml-2 text-muted-foreground">
                    {metadata.colorSpace}
                  </span>
                </div>
              )}

              {metadata.hasAlpha !== undefined && (
                <div>
                  <span className="font-medium">Canal Alpha:</span>
                  <span className="ml-2 text-muted-foreground">
                    {metadata.hasAlpha ? "Sí" : "No"}
                  </span>
                </div>
              )}

              {metadata.orientation && (
                <div>
                  <span className="font-medium">Orientación:</span>
                  <span className="ml-2 text-muted-foreground">
                    {metadata.orientation}°
                  </span>
                </div>
              )}

              {metadata.dpi && (
                <div>
                  <span className="font-medium">DPI:</span>
                  <span className="ml-2 text-muted-foreground">
                    {metadata.dpi.x} × {metadata.dpi.y}
                  </span>
                </div>
              )}

              <div>
                <span className="font-medium">Última modificación:</span>
                <span className="ml-2 text-muted-foreground">
                  {formatDate(metadata.lastModified)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Información básica */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <span className="font-medium">Tipo MIME:</span>{" "}
            {attachment.mimeType}
          </p>
          <p>
            <span className="font-medium">Tamaño:</span> {size}
          </p>
          <p>
            <span className="font-medium">Subido:</span>{" "}
            {formatDate(new Date())}
          </p>
        </div>
      </CardContent>

      {/* Vista previa modal para imágenes */}
      {showPreview && canPreview && fileType === "image" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative max-w-5xl max-h-5xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(false)}
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
            >
              <X size={20} />
            </Button>

            {imageBlob ? (
              <img
                src={imageBlob}
                alt={attachment.fileName}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <div className="max-w-5xl max-h-5xl bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-lg">
                  Cargando imagen...
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AdvancedFilePreview;
