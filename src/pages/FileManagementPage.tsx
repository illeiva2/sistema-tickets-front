import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
} from "@/components/ui";
import {
  Folder,
  Tag,
  Search,
  Plus,
  Trash2,
  Edit,
  FileText,
  Image,
  Archive,
  Code,
  Eye,
  Download,
} from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";

interface FileCategory {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FileTag {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FileOrganization {
  id: string;
  categoryId: string | null;
  tags: string[];
  customPath: string | null;
}

interface FileInfo {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  createdAt: Date;
  ticketId: string;
  organization: FileOrganization | null;
}

export const FileManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<FileCategory[]>([]);
  const [tags, setTags] = useState<FileTag[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FileCategory | null>(
    null,
  );
  const [editingTag, setEditingTag] = useState<FileTag | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para formularios
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "📁",
    parentId: "",
  });

  const [tagForm, setTagForm] = useState({
    name: "",
    description: "",
    color: "#6B7280",
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, tagsRes, filesRes] = await Promise.all([
        api.get("/api/file-organization/categories"),
        api.get("/api/file-organization/tags"),
        api.get("/api/file-organization/search?query="),
      ]);

      setCategories(categoriesRes.data.data || []);
      setTags(tagsRes.data.data || []);

      console.log("🔍 API Response - Files:", filesRes.data);
      console.log("🔍 API Response - Categories:", categoriesRes.data);
      console.log("🔍 API Response - Tags:", tagsRes.data);

      setFiles(filesRes.data.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  // Crear categoría
  const createCategory = async () => {
    try {
      const response = await api.post(
        "/api/file-organization/categories",
        categoryForm,
      );
      setCategories([...categories, response.data.data]);
      setShowCategoryModal(false);
      resetCategoryForm();
      toast.success("Categoría creada exitosamente");
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Error al crear la categoría");
    }
  };

  // Actualizar categoría
  const updateCategory = async () => {
    if (!editingCategory) return;

    try {
      const response = await api.put(
        `/api/file-organization/categories/${editingCategory.id}`,
        categoryForm,
      );
      setCategories(
        categories.map((cat) =>
          cat.id === editingCategory.id ? response.data.category : cat,
        ),
      );
      setEditingCategory(null);
      setShowCategoryModal(false);
      resetCategoryForm();
      toast.success("Categoría actualizada exitosamente");
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Error al actualizar la categoría");
    }
  };

  // Eliminar categoría
  const deleteCategory = async (categoryId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta categoría?"))
      return;

    try {
      await api.delete(`/api/file-organization/categories/${categoryId}`);
      setCategories(categories.filter((cat) => cat.id !== categoryId));
      toast.success("Categoría eliminada exitosamente");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Error al eliminar la categoría");
    }
  };

  // Crear etiqueta
  const createTag = async () => {
    try {
      const response = await api.post("/api/file-organization/tags", tagForm);
      setTags([...tags, response.data.data]);
      setShowTagModal(false);
      resetTagForm();
      toast.success("Etiqueta creada exitosamente");
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error("Error al crear la etiqueta");
    }
  };

  // Actualizar etiqueta
  const updateTag = async () => {
    if (!editingTag) return;

    try {
      const response = await api.put(
        `/api/file-organization/tags/${editingTag.id}`,
        tagForm,
      );
      setTags(
        tags.map((tag) => (tag.id === editingTag.id ? response.data.tag : tag)),
      );
      setEditingTag(null);
      setShowTagModal(false);
      resetTagForm();
      toast.success("Etiqueta actualizada exitosamente");
    } catch (error) {
      console.error("Error updating tag:", error);
      toast.error("Error al actualizar la etiqueta");
    }
  };

  // Eliminar etiqueta
  const deleteTag = async (tagId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta etiqueta?"))
      return;

    try {
      await api.delete(`/api/file-organization/tags/${tagId}`);
      setTags(tags.filter((tag) => tag.id !== tagId));
      toast.success("Etiqueta eliminada exitosamente");
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast.error("Error al eliminar la etiqueta");
    }
  };

  // Buscar archivos
  const searchFiles = async () => {
    try {
      const response = await api.get(
        `/api/file-organization/search?query=${encodeURIComponent(searchQuery)}`,
      );
      setFiles(response.data.data || []);
    } catch (error) {
      console.error("Error searching files:", error);
      toast.error("Error al buscar archivos");
    }
  };

  // Editar categoría
  const editCategory = (category: FileCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      color: category.color,
      icon: category.icon,
      parentId: category.parentId || "",
    });
    setShowCategoryModal(true);
  };

  // Editar etiqueta
  const editTag = (tag: FileTag) => {
    setEditingTag(tag);
    setTagForm({
      name: tag.name,
      description: tag.description || "",
      color: tag.color,
    });
    setShowTagModal(true);
  };

  // Resetear formularios
  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      description: "",
      color: "#3B82F6",
      icon: "📁",
      parentId: "",
    });
  };

  const resetTagForm = () => {
    setTagForm({
      name: "",
      description: "",
      color: "#6B7280",
    });
  };

  // Obtener icono por tipo de archivo
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/"))
      return <Image size={16} className="text-blue-500" />;
    if (mimeType.startsWith("text/") || mimeType.includes("pdf"))
      return <FileText size={16} className="text-green-500" />;
    if (mimeType.includes("zip") || mimeType.includes("rar"))
      return <Archive size={16} className="text-orange-500" />;
    if (mimeType.includes("javascript") || mimeType.includes("python"))
      return <Code size={16} className="text-purple-500" />;
    return <FileText size={16} className="text-gray-500" />;
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Archivos</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setShowCategoryModal(true)}>
            <Plus size={16} className="mr-2" />
            Nueva Categoría
          </Button>
          <Button onClick={() => setShowTagModal(true)} variant="outline">
            <Plus size={16} className="mr-2" />
            Nueva Etiqueta
          </Button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="flex space-x-2">
        <Input
          placeholder="Buscar archivos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button onClick={searchFiles}>
          <Search size={16} className="mr-2" />
          Buscar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categorías */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Folder size={20} className="mr-2" />
              Categorías ({categories.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories &&
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      style={{ color: category.color }}
                      className="text-2xl"
                    >
                      {category.icon}
                    </span>
                    <div>
                      <div className="font-medium">{category.name}</div>
                      {category.description && (
                        <div className="text-sm text-muted-foreground">
                          {category.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editCategory(category)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategory(category.id)}
                      className="text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            {categories.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No hay categorías creadas
              </div>
            )}
          </CardContent>
        </Card>

        {/* Etiquetas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag size={20} className="mr-2" />
              Etiquetas ({tags.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tags &&
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Badge
                      style={{ backgroundColor: tag.color, color: "white" }}
                      className="px-3 py-1 text-sm font-medium"
                    >
                      {tag.name}
                    </Badge>
                    {tag.description && (
                      <div className="text-sm text-muted-foreground">
                        {tag.description}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editTag(tag)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTag(tag.id)}
                      className="text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            {tags.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No hay etiquetas creadas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Archivos */}
      <Card>
        <CardHeader>
          <CardTitle>Archivos ({files.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {files.map((file) => {
              // Resolver categoría
              const categoryId = file.organization?.categoryId;
              const category = categoryId
                ? categories.find((c) => c.id === categoryId)
                : null;

              // Resolver etiquetas
              const fileTagIds = file.organization?.tags || [];
              const fileTags = tags.filter((t) => fileTagIds.includes(t.id));

              const handleDownload = async () => {
                try {
                  const storedFileName = file.storageUrl.split("/").pop() || file.fileName;
                  const response = await api.get(`/api/files/${encodeURIComponent(storedFileName)}`, {
                    responseType: "blob",
                  });
                  const blob = new Blob([response.data]);
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = file.fileName;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error("Error downloading:", error);
                  toast.error("Error al descargar el archivo");
                }
              };

              const handlePreview = async () => {
                try {
                  const storedFileName = file.storageUrl.split("/").pop() || file.fileName;
                  const response = await api.get(`/api/files/${encodeURIComponent(storedFileName)}`, { responseType: 'blob' });
                  const blob = new Blob([response.data], { type: file.mimeType });
                  const url = window.URL.createObjectURL(blob);
                  window.open(url, '_blank');
                  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
                } catch (e) {
                  toast.error("No se pudo previsualizar");
                }
              };

              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {getFileIcon(file.mimeType)}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate" title={file.fileName}>
                        {file.fileName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center space-x-2">
                        <span>{formatFileSize(file.sizeBytes)}</span>
                        <span>•</span>
                        <span className="truncate">{file.mimeType}</span>
                        <span>•</span>
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {category && (
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: category.color + "20", // 20% opacity for bg
                          color: category.color,
                          borderColor: category.color,
                        }}
                        className="px-2 py-0.5 text-xs font-medium border"
                      >
                        {category.icon} {category.name}
                      </Badge>
                    )}

                    {fileTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        style={{ borderColor: tag.color, color: tag.color }}
                        className="px-2 py-0.5 text-xs font-medium"
                      >
                        {tag.name}
                      </Badge>
                    ))}

                    <div className="flex items-center space-x-1 ml-2 pl-2 border-l">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePreview}
                        title="Ver"
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
                    </div>
                  </div>
                </div>
              );
            })}
            {files.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No se encontraron archivos
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Categoría */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </h3>
            <div className="space-y-4">
              <Input
                placeholder="Nombre de la categoría"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
              />
              <Input
                placeholder="Descripción (opcional)"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
              />
              <Input
                type="color"
                value={categoryForm.color}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, color: e.target.value })
                }
                className="w-20"
              />
              <Input
                placeholder="Icono (emoji)"
                value={categoryForm.icon}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, icon: e.target.value })
                }
                maxLength={2}
              />
              <select
                value={categoryForm.parentId}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, parentId: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="">Sin categoría padre</option>
                {categories &&
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  resetCategoryForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={editingCategory ? updateCategory : createCategory}
              >
                {editingCategory ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Etiqueta */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {editingTag ? "Editar Etiqueta" : "Nueva Etiqueta"}
            </h3>
            <div className="space-y-4">
              <Input
                placeholder="Nombre de la etiqueta"
                value={tagForm.name}
                onChange={(e) =>
                  setTagForm({ ...tagForm, name: e.target.value })
                }
              />
              <Input
                placeholder="Descripción (opcional)"
                value={tagForm.description}
                onChange={(e) =>
                  setTagForm({ ...tagForm, description: e.target.value })
                }
              />
              <Input
                type="color"
                value={tagForm.color}
                onChange={(e) =>
                  setTagForm({ ...tagForm, color: e.target.value })
                }
                className="w-20"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTagModal(false);
                  setEditingTag(null);
                  resetTagForm();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={editingTag ? updateTag : createTag}>
                {editingTag ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManagementPage;
