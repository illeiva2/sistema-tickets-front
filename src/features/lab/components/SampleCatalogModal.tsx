import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { labApi, labError, labKeys } from "../api";
import { claveDesdeEtiqueta, erroresDeCampos, opcionesDe } from "../samples";
import type { FieldDefInput, FieldDefUpdateInput, LabFieldType, SampleFieldDefDto, SampleKindDto } from "../types";
import { LabModal } from "./LabModal";
import { LabTableSkeleton } from "./Loading";
import { fmtRelative } from "../format";

/**
 * Administración del catálogo de campos (MANAGEMENT).
 *
 * Es lo que hace configurable el registro: "número de transporte" se agrega
 * acá, sin deploy. Reglas que el backend impone y la pantalla refleja:
 * - la clave y el tipo quedan fijos una vez creado el campo (las muestras ya
 *   cargadas guardan valores bajo esa clave, con ese tipo);
 * - un campo no se borra, se desactiva (los valores históricos se conservan).
 */

const CLASE_CONTROL =
  "w-full h-9 px-2.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60";

const TIPOS: { value: LabFieldType; label: string }[] = [
  { value: "TEXT", label: "Texto" },
  { value: "SELECT", label: "Lista de opciones" },
  { value: "BOOLEAN", label: "Casilla (sí / no)" },
  { value: "NUMBER", label: "Número" },
  { value: "DATETIME", label: "Fecha y hora" },
];
const TIPO_LABEL = Object.fromEntries(TIPOS.map((t) => [t.value, t.label])) as Record<LabFieldType, string>;

interface Borrador {
  label: string;
  key: string;
  type: LabFieldType;
  required: boolean;
  optionsTexto: string;
  inName: boolean;
  namePrefix: string;
  placeholder: string;
  sortOrder: string;
  isActive: boolean;
  isCondition: boolean;
  /** Opciones que cuentan como alteración, separadas por coma. Vacío = cualquiera. */
  conditionValuesTexto: string;
  /** Clave del campo del que depende; vacío = siempre se pide. */
  visibleWhenField: string;
  /** Opciones del controlador que muestran este campo, separadas por coma. */
  visibleWhenValuesTexto: string;
  pattern: string;
  patternHint: string;
  withPercent: boolean;
  suggest: boolean;
  uppercase: boolean;
  /** Valor con el que arranca el campo en una muestra nueva. Vacío = ninguno. */
  defaultValue: string;
  /** Lista: ofrecer un desplegable para filtrar por este campo en Muestras y Análisis. */
  filterable: boolean;
}

const borradorVacio = (siguienteOrden: number): Borrador => ({
  label: "",
  key: "",
  type: "TEXT",
  required: false,
  optionsTexto: "",
  inName: false,
  namePrefix: "",
  placeholder: "",
  sortOrder: String(siguienteOrden),
  isActive: true,
  isCondition: false,
  conditionValuesTexto: "",
  visibleWhenField: "",
  visibleWhenValuesTexto: "",
  pattern: "",
  patternHint: "",
  withPercent: false,
  suggest: false,
  uppercase: false,
  defaultValue: "",
  filterable: false,
});

const borradorDe = (d: SampleFieldDefDto): Borrador => ({
  label: d.label,
  key: d.key,
  type: d.type,
  required: d.required,
  optionsTexto: opcionesDe(d).join("\n"),
  inName: d.inName,
  namePrefix: d.namePrefix ?? "",
  placeholder: d.placeholder ?? "",
  sortOrder: String(d.sortOrder),
  isActive: d.isActive,
  isCondition: d.isCondition,
  conditionValuesTexto: (d.conditionValues ?? []).join(", "),
  visibleWhenField: d.visibleWhen?.field ?? "",
  visibleWhenValuesTexto: (d.visibleWhen?.values ?? []).join(", "),
  pattern: d.pattern ?? "",
  patternHint: d.patternHint ?? "",
  withPercent: d.withPercent,
  suggest: d.suggest,
  uppercase: d.uppercase,
  defaultValue: d.defaultValue ?? "",
  filterable: d.filterable,
});

export const SampleCatalogModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const qc = useQueryClient();
  const kindsQ = useQuery({
    queryKey: labKeys.samplesKindsAll,
    queryFn: () => labApi.samples.kinds(true),
  });
  const kinds = kindsQ.data ?? [];

  const [kindId, setKindId] = React.useState<string | null>(null);
  const kind: SampleKindDto | undefined = kinds.find((k) => k.id === (kindId ?? kinds[0]?.id));

  // null = tabla; "nuevo" = alta; SampleFieldDefDto = edición.
  const [editando, setEditando] = React.useState<"nuevo" | SampleFieldDefDto | null>(null);

  const invalidar = () => void qc.invalidateQueries({ queryKey: labKeys.samplesAll });

  return (
    <LabModal
      wide
      onClose={onClose}
      title="Campos de la ficha de muestra"
      footer={
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {kindsQ.isPending && <LabTableSkeleton rows={4} cols={4} />}
      {kindsQ.error && (
        <p className="text-sm text-red-700 dark:text-red-300">{labError(kindsQ.error)}</p>
      )}

      {kind && (
        <div className="space-y-4">
          {kinds.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist">
              {kinds.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  role="tab"
                  aria-selected={k.id === kind.id}
                  onClick={() => {
                    setKindId(k.id);
                    setEditando(null);
                  }}
                  className={`px-3 py-1.5 rounded-md border text-[12.5px] transition-colors ${
                    k.id === kind.id
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {k.name}
                </button>
              ))}
            </div>
          )}

          {kind.fields.some((f) => f.key === "empresa") && <EstadoProductores />}

          <p className="text-[11.5px] text-muted-foreground">
            Fecha y hora de la toma, laboratorio y notas son fijos de toda muestra; acá se definen los
            demás campos. La clave y el tipo no se cambian después: para cambiar un tipo, desactivá el
            campo y creá otro.
          </p>

          {editando ? (
            <FormularioCampo
              kind={kind}
              def={editando === "nuevo" ? null : editando}
              onCancel={() => setEditando(null)}
              onSaved={() => {
                setEditando(null);
                invalidar();
              }}
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                      <th className="font-medium px-3 py-1.5 w-12">Orden</th>
                      <th className="font-medium px-3 py-1.5">Etiqueta</th>
                      <th className="font-medium px-3 py-1.5">Clave</th>
                      <th className="font-medium px-3 py-1.5">Tipo</th>
                      <th className="font-medium px-3 py-1.5 text-center">Oblig.</th>
                      <th className="font-medium px-3 py-1.5 text-center">En nombre</th>
                      <th className="font-medium px-3 py-1.5 text-center" title="Cuenta como alteración de la muestra">Alerta</th>
                      <th className="font-medium px-3 py-1.5 text-center">Activo</th>
                      <th className="px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {kind.fields.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">
                          Este tipo no tiene campos todavía.
                        </td>
                      </tr>
                    )}
                    {kind.fields.map((d) => (
                      <tr key={d.id} className={d.isActive ? "" : "text-muted-foreground/70"}>
                        <td className="px-3 py-1.5 text-[12px] tabular-nums">{d.sortOrder}</td>
                        <td className="px-3 py-1.5 text-[12.5px] font-medium">
                          {d.label}
                          {d.type === "SELECT" && (
                            <span className="block text-[10.5px] text-muted-foreground font-normal truncate max-w-[280px]">
                              {opcionesDe(d).join(" · ")}
                            </span>
                          )}
                          {d.visibleWhen && (
                            <span className="block text-[10.5px] text-muted-foreground font-normal truncate max-w-[280px]">
                              solo si {d.visibleWhen.field} = {d.visibleWhen.values.join(" / ")}
                            </span>
                          )}
                          {(d.pattern || d.withPercent || d.suggest || d.uppercase || d.defaultValue || d.filterable) && (
                            <span className="block text-[10.5px] text-muted-foreground font-normal">
                              {[
                                d.pattern ? "formato" : null,
                                d.withPercent ? "con %" : null,
                                d.suggest ? "sugerencias" : null,
                                d.uppercase ? "mayúsculas" : null,
                                d.defaultValue ? `arranca en "${d.defaultValue}"` : null,
                                d.filterable ? "filtro" : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-[11.5px] font-mono">{d.key}</td>
                        <td className="px-3 py-1.5 text-[12px] whitespace-nowrap">{TIPO_LABEL[d.type]}</td>
                        <td className="px-3 py-1.5 text-center text-[12px]">{d.required ? "sí" : "—"}</td>
                        <td className="px-3 py-1.5 text-center text-[12px]">
                          {d.inName ? (d.namePrefix ? `"${d.namePrefix}…"` : "sí") : "—"}
                        </td>
                        <td
                          className="px-3 py-1.5 text-center text-[12px]"
                          title={
                            d.isCondition
                              ? d.conditionValues?.length
                                ? `Cuenta: ${d.conditionValues.join(", ")}`
                                : "Cuenta cualquier valor"
                              : undefined
                          }
                        >
                          {d.isCondition ? "⚠" : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-center text-[12px]">{d.isActive ? "sí" : "no"}</td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setEditando(d)}
                            aria-label={`Editar ${d.label}`}
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditando("nuevo")}>
                <Plus size={13} className="mr-1.5" />
                Agregar campo
              </Button>
            </>
          )}
        </div>
      )}
    </LabModal>
  );
};

/**
 * Estado de la lista de empresas del ERP que alimenta las sugerencias de
 * "Empresa". El job nocturno puede dejar de correr sin que nadie lo note (ya
 * pasó con otro sync): acá se ve cuándo fue la última carga buena.
 */
const EstadoProductores: React.FC = () => {
  const q = useQuery({
    queryKey: labKeys.productoresStatus,
    queryFn: labApi.productores.status,
    staleTime: 60_000,
  });
  if (!q.data) return null;
  const d = q.data;
  const carga = d.ultimaOk ? `actualizada ${fmtRelative(d.ultimaOk)}` : "todavía sin cargar";
  return (
    <p
      className={`text-[11.5px] rounded-md border px-3 py-2 ${
        d.desactualizado
          ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
          : "border-border bg-muted/20 text-muted-foreground"
      }`}
    >
      <strong>Empresas del ERP para "Empresa":</strong> {d.activos} activas de {d.total}, {carga}.
      {d.desactualizado && " La lista está desactualizada: revisá el job nocturno."}
      {d.ultimaCorrida?.status === "ERROR" && d.ultimaCorrida.error && ` Último error: ${d.ultimaCorrida.error}`}
    </p>
  );
};

const Campo: React.FC<{ label: string; error?: string; hint?: string; className?: string; children: React.ReactNode }> = ({
  label,
  error,
  hint,
  className = "",
  children,
}) => (
  <label className={`block ${className}`}>
    <span className="block text-[11.5px] text-muted-foreground mb-1">{label}</span>
    {children}
    {error ? (
      <span className="block text-[11.5px] text-red-600 dark:text-red-400 mt-1">{error}</span>
    ) : hint ? (
      <span className="block text-[11px] text-muted-foreground mt-1">{hint}</span>
    ) : null}
  </label>
);

const Check: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }> = ({
  label,
  checked,
  onChange,
  hint,
}) => (
  <label className="flex items-start gap-2 text-[12.5px] cursor-pointer select-none">
    <input
      type="checkbox"
      className="mt-0.5"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>
      {label}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </span>
  </label>
);

const FormularioCampo: React.FC<{
  kind: SampleKindDto;
  def: SampleFieldDefDto | null;
  onCancel: () => void;
  onSaved: () => void;
}> = ({ kind, def, onCancel, onSaved }) => {
  const esEdicion = def !== null;
  const siguienteOrden = kind.fields.reduce((max, f) => Math.max(max, f.sortOrder), 0) + 1;
  const [b, setB] = React.useState<Borrador>(def ? borradorDe(def) : borradorVacio(siguienteOrden));
  const [claveTocada, setClaveTocada] = React.useState(esEdicion);
  const [errores, setErrores] = React.useState<Record<string, string>>({});

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((prev) => ({ ...prev, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const options =
        b.type === "SELECT"
          ? b.optionsTexto
              .split("\n")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined;
      // Para una lista marcada como alteración: qué opciones cuentan. Vacío
      // viaja como null = cualquier valor cuenta. En otros tipos no aplica.
      const conditionValues =
        b.type === "SELECT" && b.isCondition
          ? b.conditionValuesTexto
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined;
      const visibleWhenValues = b.visibleWhenValuesTexto
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      const comun = {
        label: b.label.trim(),
        required: b.required,
        options,
        inName: b.inName,
        namePrefix: b.namePrefix.trim() || null,
        placeholder: b.placeholder.trim() || null,
        sortOrder: Number(b.sortOrder) || 0,
        isCondition: b.isCondition,
        conditionValues:
          conditionValues === undefined ? undefined : conditionValues.length > 0 ? conditionValues : null,
        // Sin controlador o sin opciones, la regla se limpia (null): el campo vuelve a pedirse siempre.
        visibleWhen:
          b.visibleWhenField.trim() && visibleWhenValues.length > 0
            ? { field: b.visibleWhenField.trim(), values: visibleWhenValues }
            : null,
        pattern: b.type === "TEXT" ? b.pattern.trim() || null : null,
        patternHint: b.type === "TEXT" ? b.patternHint.trim() || null : null,
        withPercent: b.type === "BOOLEAN" && b.withPercent,
        suggest: b.type === "TEXT" && b.suggest,
        uppercase: b.type === "TEXT" && b.uppercase,
        // Valor inicial solo en listas y textos; en una lista tiene que ser una
        // opción (el backend lo exige). Vacío viaja como null = ninguno.
        defaultValue: b.type === "SELECT" || b.type === "TEXT" ? b.defaultValue.trim() || null : null,
        filterable: b.type === "SELECT" && b.filterable,
      };
      if (esEdicion) {
        const input: FieldDefUpdateInput = { ...comun, isActive: b.isActive };
        return labApi.samples.updateField(def!.id, input);
      }
      const input: FieldDefInput = { ...comun, key: b.key.trim(), type: b.type };
      return labApi.samples.createField(kind.id, input);
    },
    onSuccess: () => {
      toast.success(esEdicion ? "Campo actualizado" : "Campo agregado");
      onSaved();
    },
    onError: (e) => {
      const porCampo = erroresDeCampos(e);
      setErrores(porCampo);
      toast.error(Object.keys(porCampo).length > 0 ? "Revisá los campos marcados" : labError(e));
    },
  });

  return (
    <form
      className="space-y-3 rounded-md border border-border p-3 bg-muted/10"
      onSubmit={(e) => {
        e.preventDefault();
        if (!mutation.isPending) mutation.mutate();
      }}
    >
      <h4 className="text-sm font-semibold">
        {esEdicion ? `Editar "${def!.label}"` : `Nuevo campo en ${kind.name}`}
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo label="Etiqueta" error={errores.label}>
          <input
            className={CLASE_CONTROL}
            value={b.label}
            maxLength={80}
            autoFocus
            onChange={(e) => {
              set("label", e.target.value);
              if (!claveTocada) set("key", claveDesdeEtiqueta(e.target.value));
            }}
            placeholder="Ej.: Número de transporte"
          />
        </Campo>
        <Campo
          label="Clave"
          error={errores.key}
          hint={esEdicion ? "Fija: las muestras guardan sus valores bajo esta clave." : "snake_case; se propone desde la etiqueta."}
        >
          <input
            className={`${CLASE_CONTROL} font-mono`}
            value={b.key}
            maxLength={40}
            disabled={esEdicion}
            onChange={(e) => {
              setClaveTocada(true);
              set("key", e.target.value);
            }}
          />
        </Campo>
        <Campo label="Tipo" error={errores.type} hint={esEdicion ? "Fijo. Para cambiarlo, desactivá este campo y creá otro." : undefined}>
          <select
            className={CLASE_CONTROL}
            value={b.type}
            disabled={esEdicion}
            onChange={(e) => set("type", e.target.value as LabFieldType)}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Orden" error={errores.sortOrder}>
          <input
            type="number"
            min={0}
            max={1000}
            className={CLASE_CONTROL}
            value={b.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
          />
        </Campo>
        {b.type === "SELECT" && (
          <Campo label="Opciones (una por línea)" error={errores.options} className="sm:col-span-2">
            <textarea
              className={`${CLASE_CONTROL} h-auto py-2 font-mono text-[12.5px]`}
              rows={5}
              value={b.optionsTexto}
              onChange={(e) => set("optionsTexto", e.target.value)}
            />
          </Campo>
        )}
        <Campo label="Texto de ayuda en el formulario" error={errores.placeholder}>
          <input
            className={CLASE_CONTROL}
            value={b.placeholder}
            maxLength={80}
            onChange={(e) => set("placeholder", e.target.value)}
            placeholder="Ej.: Número de carta de porte"
          />
        </Campo>
        <Campo
          label="Prefijo en el nombre"
          error={errores.namePrefix}
          hint='Se antepone al valor en el nombre: "Lote " → "Lote 4521".'
        >
          <input
            className={CLASE_CONTROL}
            value={b.namePrefix}
            maxLength={20}
            onChange={(e) => set("namePrefix", e.target.value)}
            disabled={!b.inName}
          />
        </Campo>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Check label="Obligatorio" checked={b.required} onChange={(v) => set("required", v)} />
        <Check
          label="Participa del nombre"
          checked={b.inName}
          onChange={(v) => set("inName", v)}
          hint="El nombre descriptivo se arma con estos campos, en orden."
        />
        <Check
          label="Marca una alteración de la muestra"
          checked={b.isCondition}
          onChange={(v) => set("isCondition", v)}
          hint="Si está presente, la muestra lleva una advertencia en la lista y la ficha."
        />
        {esEdicion && (
          <Check
            label="Activo"
            checked={b.isActive}
            onChange={(v) => set("isActive", v)}
            hint="Desactivado deja de pedirse; los valores cargados se conservan."
          />
        )}
      </div>

      {b.type === "SELECT" && b.isCondition && (
        <Campo
          label="Opciones que cuentan como alteración"
          error={errores.conditionValues}
          hint='Separadas por coma, tal como están en la lista ("Vivos, Muertos"). Vacío = cualquier valor distinto de vacío.'
        >
          <input
            className={CLASE_CONTROL}
            value={b.conditionValuesTexto}
            onChange={(e) => set("conditionValuesTexto", e.target.value)}
            placeholder="Vivos, Muertos"
          />
        </Campo>
      )}

      {/* Reglas: cuándo se pide, qué formato y cómo se carga. Es lo que hace que
          "Lote" aparezca solo en los embolses sin tocar código. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border border-dashed border-border p-3">
        <Campo
          label="Se pide solo cuando"
          error={errores.visibleWhen}
          hint="Otro campo de este tipo de muestra. Vacío = se pide siempre."
        >
          <select
            className={CLASE_CONTROL}
            value={b.visibleWhenField}
            onChange={(e) => set("visibleWhenField", e.target.value)}
          >
            <option value="">— siempre —</option>
            {kind.fields
              .filter((f) => f.key !== b.key && f.isActive)
              .map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label} ({f.key})
                </option>
              ))}
          </select>
        </Campo>
        <Campo
          label="…vale alguna de estas opciones"
          hint='Separadas por coma, tal como están en la lista ("3/0 Embolse, 4/0 Embolse"). Para una casilla, "true".'
        >
          <input
            className={CLASE_CONTROL}
            value={b.visibleWhenValuesTexto}
            onChange={(e) => set("visibleWhenValuesTexto", e.target.value)}
            disabled={!b.visibleWhenField}
            placeholder="Trigo Sucio"
          />
        </Campo>
        {b.type === "SELECT" && (
          <>
            <Campo
              label="Valor inicial"
              error={errores.defaultValue}
              hint="Con el que arranca una muestra nueva. Vacío = se elige cada vez."
            >
              <select
                className={CLASE_CONTROL}
                value={b.defaultValue}
                onChange={(e) => set("defaultValue", e.target.value)}
              >
                <option value="">— ninguno —</option>
                {(() => {
                  const ops = b.optionsTexto
                    .split("\n")
                    .map((o) => o.trim())
                    .filter(Boolean);
                  // Un valor vigente que ya no está entre las opciones se muestra
                  // para que se vea por qué el backend lo va a rechazar.
                  if (b.defaultValue && !ops.includes(b.defaultValue)) ops.push(b.defaultValue);
                  return ops.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ));
                })()}
              </select>
            </Campo>
            <Check
              label="Ofrecer como filtro"
              checked={b.filterable}
              onChange={(v) => set("filterable", v)}
              hint="En la lista de muestras y en Análisis aparece un desplegable con estas opciones (comercio filtra por tipo de ingreso)."
            />
          </>
        )}
        {b.type === "TEXT" && (
          <>
            <Campo
              label="Formato (expresión regular)"
              error={errores.pattern}
              hint="Anclada al valor completo. Ej.: ^\d{3}[A-Z]$ para 123A. Vacío = cualquier texto."
            >
              <input
                className={`${CLASE_CONTROL} font-mono`}
                value={b.pattern}
                maxLength={200}
                onChange={(e) => set("pattern", e.target.value)}
                placeholder="^\d{3}[A-Z]$"
              />
            </Campo>
            <Campo label="Cómo explicar el formato" error={errores.patternHint} hint="Se muestra debajo del campo y en el error.">
              <input
                className={CLASE_CONTROL}
                value={b.patternHint}
                maxLength={120}
                onChange={(e) => set("patternHint", e.target.value)}
                placeholder="3 números y una letra, por ejemplo 123A"
              />
            </Campo>
            <Campo
              label="Valor inicial"
              error={errores.defaultValue}
              hint="Con el que arranca una muestra nueva. Vacío = en blanco."
            >
              <input
                className={CLASE_CONTROL}
                value={b.defaultValue}
                maxLength={80}
                onChange={(e) => set("defaultValue", e.target.value)}
              />
            </Campo>
            <Check
              label="Sugerir valores ya cargados"
              checked={b.suggest}
              onChange={(v) => set("suggest", v)}
              hint="Desplegable con lo que ya se cargó en este campo (empresas, localidades)."
            />
            <Check
              label="Guardar en mayúsculas"
              checked={b.uppercase}
              onChange={(v) => set("uppercase", v)}
              hint="Patentes, lotes."
            />
          </>
        )}
        {b.type === "BOOLEAN" && (
          <Check
            label="Al marcarse pide un porcentaje"
            checked={b.withPercent}
            onChange={(v) => set("withPercent", v)}
            hint="Lo que informa el escáner de granos (picado 1,5 %). Se guarda junto a la casilla."
          />
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={mutation.isPending || !b.label.trim() || !b.key.trim()}>
          {mutation.isPending ? "Guardando…" : esEdicion ? "Guardar cambios" : "Agregar campo"}
        </Button>
      </div>
    </form>
  );
};

export default SampleCatalogModal;
