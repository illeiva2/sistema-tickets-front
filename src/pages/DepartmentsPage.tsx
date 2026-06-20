import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Building2, Plus, Pencil, Trash2, X, Users } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import type { Department } from "../types/departments";

interface DepartmentFormState {
  id?: string;
  name: string;
  color: string;
  icon: string;
}

const emptyForm: DepartmentFormState = {
  name: "",
  color: "#3B82F6",
  icon: "",
};

const DepartmentsPage: React.FC = () => {
  const [items, setItems] = useState<Department[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DepartmentFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const resp = await api.get("/api/departments");
      setItems(resp.data?.data ?? []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "No se pudieron cargar los sectores",
      );
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (d: Department) => {
    setForm({
      id: d.id,
      name: d.name,
      color: d.color ?? "#3B82F6",
      icon: d.icon ?? "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (!submitting) {
      setShowModal(false);
      setForm(emptyForm);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      return;
    }
    const payload = {
      name,
      color: form.color || null,
      icon: form.icon.trim() || null,
    };
    try {
      setSubmitting(true);
      if (form.id) {
        await api.patch(`/api/departments/${form.id}`, payload);
        toast.success("Sector actualizado");
      } else {
        await api.post("/api/departments", payload);
        toast.success("Sector creado");
      }
      setShowModal(false);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "No se pudo guardar el sector",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (d: Department) => {
    const userCount = d._count?.users ?? 0;
    const confirmMsg =
      userCount > 0
        ? `¿Eliminar "${d.name}"? Hay ${userCount} usuario(s) asignados a este sector. Quedarán sin sector.`
        : `¿Eliminar el sector "${d.name}"?`;
    if (!confirm(confirmMsg)) return;
    try {
      await api.delete(`/api/departments/${d.id}`);
      toast.success("Sector eliminado");
      await load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "No se pudo eliminar el sector",
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            Sectores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sectores o áreas de la empresa. Permite taggear a los colaboradores
            y dirigir avisos por audiencia.
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus size={15} className="mr-1.5" />
          Nuevo sector
        </Button>
      </div>

      {items === null ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no hay sectores cargados.
          </p>
          <Button size="sm" className="mt-4" onClick={openNew}>
            <Plus size={14} className="mr-1.5" />
            Crear el primero
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card"
            >
              <span
                className="w-8 h-8 rounded-md flex items-center justify-center text-base shrink-0"
                style={{
                  backgroundColor: d.color
                    ? `${d.color}25` // ~15% opacity
                    : "var(--muted)",
                  border: d.color ? `1px solid ${d.color}60` : undefined,
                }}
                title={d.color || "Sin color"}
              >
                {d.icon || "🏷️"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{d.name}</div>
                <div className="text-[11.5px] text-muted-foreground flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <Users size={11} />
                    {d._count?.users ?? 0} usuario(s)
                  </span>
                  <span className="font-mono">{d.slug}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => openEdit(d)}
                  title="Editar"
                >
                  <Pencil size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(d)}
                  title="Eliminar"
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal crear / editar */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeModal}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {form.id ? "Editar sector" : "Nuevo sector"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-muted-foreground">
                  Nombre
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Ej: Logística"
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-muted-foreground">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, color: e.target.value }))
                      }
                      className="w-10 h-9 border border-border rounded-md cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.color}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, color: e.target.value }))
                      }
                      placeholder="#3B82F6"
                      className="flex-1 px-2 py-1.5 text-sm border border-border rounded-md bg-background font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-muted-foreground">
                    Ícono (emoji)
                  </label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, icon: e.target.value }))
                    }
                    placeholder="📦"
                    maxLength={4}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-md bg-muted/40 p-2 flex items-center gap-2">
                <span
                  className="w-8 h-8 rounded-md flex items-center justify-center text-base shrink-0"
                  style={{
                    backgroundColor: form.color
                      ? `${form.color}25`
                      : "var(--muted)",
                    border: form.color ? `1px solid ${form.color}60` : undefined,
                  }}
                >
                  {form.icon || "🏷️"}
                </span>
                <span className="text-[12.5px]">
                  {form.name || "Nombre del sector"}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Guardando..." : form.id ? "Guardar" : "Crear"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
