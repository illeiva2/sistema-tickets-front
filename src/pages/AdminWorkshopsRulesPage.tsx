import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import type { WorkshopRule } from "../types/workshops";
import type { DepartmentMini } from "../types/departments";

const AdminWorkshopsRulesPage: React.FC = () => {
  const [rules, setRules] = useState<WorkshopRule[]>([]);
  const [departments, setDepartments] = useState<DepartmentMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WorkshopRule | "new" | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [r, d] = await Promise.all([
        api.get("/api/workshops/rules"),
        api.get("/api/departments"),
      ]);
      setRules(r.data?.data ?? []);
      setDepartments(d.data?.data ?? []);
    } catch {
      toast.error("No se pudieron cargar las reglas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEnabled = async (rule: WorkshopRule) => {
    try {
      const resp = await api.patch(`/api/workshops/rules/${rule.id}`, {
        enabled: !rule.enabled,
      });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? resp.data?.data : r)),
      );
    } catch {
      toast.error("No se pudo actualizar la regla");
    }
  };

  const remove = async (rule: WorkshopRule) => {
    if (!confirm("¿Eliminar esta regla?")) return;
    try {
      await api.delete(`/api/workshops/rules/${rule.id}`);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast.success("Regla eliminada");
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/workshops/import">
              <ArrowLeft size={14} className="mr-1.5" />
              Volver
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            Reglas de clasificación de Workshops
          </h1>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={14} className="mr-1.5" />
          Nueva regla
        </Button>
      </div>

      <p className="text-[12.5px] text-muted-foreground">
        Cada workshop se clasifica al sector cuyas reglas matchean. Una
        regla puede matchear por <span className="font-medium">Mercado</span>{" "}
        (exacto) y/o por <span className="font-medium">Keywords</span> en el
        título o detalle del workshop (case-insensitive, sin acentos). Se
        ejecutan por prioridad descendente.
      </p>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Cargando…</div>
        ) : rules.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No hay reglas cargadas. Creá la primera con el botón de arriba o
            corré el seed inicial.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className={`px-4 py-3 flex items-start gap-3 ${
                  !rule.enabled ? "opacity-60" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border"
                      style={{
                        backgroundColor: rule.department.color
                          ? `${rule.department.color}20`
                          : undefined,
                        borderColor: rule.department.color
                          ? `${rule.department.color}60`
                          : undefined,
                      }}
                    >
                      {rule.department.icon && (
                        <span aria-hidden>{rule.department.icon}</span>
                      )}
                      {rule.department.name}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground tabular-nums">
                      Prioridad: {rule.priority}
                    </span>
                  </div>
                  {rule.mercadoEquals && (
                    <div className="text-[12px] mb-0.5">
                      <span className="text-muted-foreground">Mercado = </span>
                      <span className="font-medium">{rule.mercadoEquals}</span>
                    </div>
                  )}
                  {rule.keywords.length > 0 && (
                    <div className="text-[12px] mb-0.5 flex flex-wrap gap-1 mt-1">
                      {rule.keywords.map((k, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center text-[10.5px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                  {rule.whyText && (
                    <div className="text-[11.5px] text-muted-foreground italic mt-1">
                      &ldquo;{rule.whyText}&rdquo;
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleEnabled(rule)}
                    className="p-1.5 text-muted-foreground hover:text-foreground"
                    title={rule.enabled ? "Deshabilitar" : "Habilitar"}
                  >
                    {rule.enabled ? <Power size={14} /> : <PowerOff size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(rule)}
                    className="p-1.5 text-muted-foreground hover:text-foreground"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(rule)}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <RuleEditorModal
          rule={editing === "new" ? null : editing}
          departments={departments}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setRules((prev) => {
              const idx = prev.findIndex((r) => r.id === saved.id);
              if (idx === -1) return [saved, ...prev];
              const next = [...prev];
              next[idx] = saved;
              return next;
            });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
};

interface RuleEditorModalProps {
  rule: WorkshopRule | null;
  departments: DepartmentMini[];
  onClose: () => void;
  onSaved: (rule: WorkshopRule) => void;
}

const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  rule,
  departments,
  onClose,
  onSaved,
}) => {
  const [departmentId, setDepartmentId] = useState(
    rule?.departmentId ?? departments[0]?.id ?? "",
  );
  const [mercadoEquals, setMercadoEquals] = useState(
    rule?.mercadoEquals ?? "",
  );
  const [keywords, setKeywords] = useState(rule?.keywords.join(", ") ?? "");
  const [whyText, setWhyText] = useState(rule?.whyText ?? "");
  const [priority, setPriority] = useState(rule?.priority ?? 0);
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      departmentId,
      mercadoEquals: mercadoEquals.trim() || null,
      keywords: keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      whyText: whyText.trim() || null,
      priority,
      enabled,
    };
    if (!payload.mercadoEquals && payload.keywords.length === 0) {
      toast.error("Necesitás definir un mercado o al menos una keyword");
      return;
    }
    try {
      setSaving(true);
      const resp = rule
        ? await api.patch(`/api/workshops/rules/${rule.id}`, payload)
        : await api.post(`/api/workshops/rules`, payload);
      onSaved(resp.data?.data);
      toast.success(rule ? "Regla actualizada" : "Regla creada");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "No se pudo guardar la regla",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        className="bg-card border border-border rounded-lg shadow-xl w-full max-w-lg p-5 space-y-4"
      >
        <h2 className="text-lg font-semibold">
          {rule ? "Editar regla" : "Nueva regla"}
        </h2>

        <div className="space-y-1">
          <label className="text-[12.5px] font-medium text-muted-foreground">
            Sector destino
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full px-2 py-2 text-sm border border-border rounded-md bg-background"
            required
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.icon ? `${d.icon} ` : ""}
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[12.5px] font-medium text-muted-foreground">
            Mercado (match exacto, opcional)
          </label>
          <input
            type="text"
            value={mercadoEquals}
            onChange={(e) => setMercadoEquals(e.target.value)}
            placeholder='Ej: "AGRO", "SUELDOS / QUIPPOS", "TODOS LOS MERCADOS"'
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[12.5px] font-medium text-muted-foreground">
            Keywords (separadas por coma)
          </label>
          <textarea
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="ganaderia, campaña agricola, finnapp agro"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background resize-y"
          />
          <p className="text-[11px] text-muted-foreground">
            Matcheo en título + detalle, case-insensitive y sin acentos.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[12.5px] font-medium text-muted-foreground">
              Prioridad
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
              min={0}
              max={1000}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[12.5px] font-medium text-muted-foreground">
              Estado
            </label>
            <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-background cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="text-sm">Habilitada</span>
            </label>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[12.5px] font-medium text-muted-foreground">
            &ldquo;Por qué te sirve&rdquo; (opcional)
          </label>
          <textarea
            value={whyText}
            onChange={(e) => setWhyText(e.target.value)}
            placeholder="Texto que aparece junto al workshop como justificación para este sector."
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background resize-y"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminWorkshopsRulesPage;
