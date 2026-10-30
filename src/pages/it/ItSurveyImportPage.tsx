import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Database,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { assetKeys } from "@/features/it/inventory/useAssets";
import { phoneLineKeys } from "@/features/it/phone-lines/usePhoneLines";
import { staffKeys } from "@/features/it/staff/useStaff";
import {
  applySurveyImport,
  getSurveyError,
  previewSurveyImport,
} from "@/features/it/survey-import/api";
import {
  SURVEY_ACTION_LABELS,
  SURVEY_APPLIED_LABELS,
  SURVEY_KINDS,
  type SurveyApplied,
  type SurveyItem,
  type SurveyPreview,
  type SurveySectorMap,
} from "@/features/it/survey-import/types";
import "@/features/it/inventory/inventory.css";
import "@/features/it/survey-import/survey-import.css";

// La planilla del relevamiento son unas decenas de filas: más que esto no es ella.
const MAX_CSV_BYTES = 2_000_000;

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("No se pudo leer el archivo."));
    reader.readAsText(file, "UTF-8");
  });
}

const rowsLabel = (rows: number[]) =>
  rows.length === 1 ? `Fila ${rows[0]}` : `Filas ${rows.join(", ")}`;

const countLabel = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

function appliedLines(applied: SurveyApplied): string[] {
  const join = (parts: Array<[number, string, string]>) =>
    parts
      .filter(([count]) => count > 0)
      .map(([count, one, many]) => countLabel(count, one, many))
      .join(", ");
  return [
    [
      "Personas",
      join([
        [applied.people.created, "nueva", "nuevas"],
        [applied.people.updated, "completada", "completadas"],
      ]),
    ],
    [
      "Equipos",
      join([
        [applied.assets.created, "nuevo", "nuevos"],
        [applied.assets.assigned, "asignado", "asignados"],
        [applied.assets.updated, "completado", "completados"],
      ]),
    ],
    [
      "Líneas",
      join([
        [applied.lines.created, "nueva", "nuevas"],
        [applied.lines.assigned, "asignada", "asignadas"],
        [applied.lines.updated, "con su celular", "con su celular"],
      ]),
    ],
  ]
    .filter(([, detail]) => detail)
    .map(([label, detail]) => `${label}: ${detail}.`);
}

function ItemsGroup({
  label,
  items,
  total,
  applied,
}: {
  label: string;
  items: SurveyItem[];
  total: number;
  applied: boolean;
}) {
  if (total === 0) return null;
  const actionLabels = applied ? SURVEY_APPLIED_LABELS : SURVEY_ACTION_LABELS;
  const headingId = `survey-group-${label.toLowerCase()}`;
  return (
    <section className="survey-group" aria-labelledby={headingId}>
      <h2 id={headingId}>
        {label} <span>{total}</span>
      </h2>
      {items.length === 0 ? (
        <p className="survey-group__help">Nada cambia.</p>
      ) : (
        <ul className="survey-items">
          {items.map((item) => (
            <li
              key={`${item.kind}:${item.key}`}
              className="survey-item"
              data-action={item.action}
            >
              <span className="survey-action" data-action={item.action}>
                {actionLabels[item.action]}
              </span>
              <div className="survey-item__main">
                <strong>{item.title}</strong>
                {item.detail && <small>{item.detail}</small>}
                {item.notes.length > 0 && (
                  <ul className="survey-item__notes">
                    {item.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="survey-item__holder">
                {item.holder && (
                  <>
                    <small>Asignado a</small>
                    <span>{item.holder}</span>
                  </>
                )}
                <small>{rowsLabel(item.rows)}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ItSurveyImportPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<{ name: string; csv: string } | null>(null);
  const [sectorMap, setSectorMap] = useState<SurveySectorMap>({});
  const [preview, setPreview] = useState<SurveyPreview | null>(null);
  const [applied, setApplied] = useState<SurveyApplied | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const previewMutation = useMutation({
    mutationFn: (variables: { csv: string; sectorMap: SurveySectorMap }) =>
      previewSurveyImport(variables.csv, variables.sectorMap),
  });
  const applyMutation = useMutation({
    mutationFn: (variables: {
      csv: string;
      sectorMap: SurveySectorMap;
      planHash: string;
    }) =>
      applySurveyImport(variables.csv, variables.sectorMap, variables.planHash),
  });
  const busy = previewMutation.isPending || applyMutation.isPending;

  // Los callbacks van en cada mutate: si se piden dos vistas previas seguidas,
  // solo cuenta la última.
  const requestPreview = (csv: string, map: SurveySectorMap) =>
    previewMutation.mutate(
      { csv, sectorMap: map },
      {
        onSuccess: (data) => {
          setPreview(data);
          setError(null);
        },
        onError: (requestError) => {
          setPreview(null);
          setError(getSurveyError(requestError).message);
        },
      },
    );

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    // Para poder volver a elegir el mismo archivo después de editar la planilla.
    event.target.value = "";
    if (!chosen) return;
    setPreview(null);
    setApplied(null);
    setError(null);
    setSectorMap({});
    if (chosen.size > MAX_CSV_BYTES) {
      setFile(null);
      setError(
        "El archivo es demasiado grande para ser la planilla del relevamiento.",
      );
      return;
    }
    try {
      const csv = await readText(chosen);
      setFile({ name: chosen.name, csv });
      requestPreview(csv, {});
    } catch (readError) {
      setFile(null);
      setError(getSurveyError(readError).message);
    }
  };

  const changeSector = (value: string, departmentId: string) => {
    if (!file) return;
    const map = { ...sectorMap, [value]: departmentId || null };
    setSectorMap(map);
    requestPreview(file.csv, map);
  };

  const confirmImport = () => {
    if (!file || !preview) return;
    applyMutation.mutate(
      { csv: file.csv, sectorMap, planHash: preview.planHash },
      {
        onSuccess: (result) => {
          setPreview(result.preview);
          setApplied(result.applied);
          toast.success("Relevamiento importado");
          for (const queryKey of [
            assetKeys.all,
            staffKeys.all,
            phoneLineKeys.all,
            ["it", "overview"],
          ]) {
            void queryClient.invalidateQueries({ queryKey });
          }
        },
        onError: (requestError) => {
          const info = getSurveyError(requestError);
          if (info.code === "SURVEY_PLAN_CHANGED" && info.preview) {
            setPreview(info.preview);
          }
          toast.error(info.message);
        },
      },
    );
  };

  const counts = preview?.counts;
  const pending = counts ? counts.create + counts.assign + counts.update : 0;

  return (
    <section className="it-inventory it-survey" aria-labelledby="survey-title">
      <div className="inventory-commandbar">
        <span className="inventory-wordmark">GRF//OPS</span>
        <span className="inventory-commandbar__path">
          CMDB / INVENTARIO / RELEVAMIENTO
        </span>
        <span className="inventory-commandbar__sync" aria-live="polite">
          <Database size={13} aria-hidden="true" />
          {busy ? "Procesando" : "API / IT-SURVEY"}
        </span>
      </div>

      <header className="inventory-header">
        <div>
          <p className="inventory-eyebrow">Relevamiento de equipos / Carga</p>
          <h1 id="survey-title">Importar relevamiento</h1>
          <p>
            Carga las respuestas del formulario en el inventario y en Personal y
            líneas. Primero ves qué se va a hacer: no se guarda nada hasta que
            confirmes.
          </p>
        </div>
        <div className="inventory-header__actions">
          <Link
            className="inventory-button inventory-button--ghost"
            to="/it/inventory"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Inventario
          </Link>
        </div>
      </header>

      <div className="inventory-content">
        <div className="survey-source">
          <div>
            <h2>Planilla de respuestas</h2>
            <p>
              En la planilla «Relevamiento de equipos (respuestas)»: Archivo →
              Descargar → Valores separados por comas (.csv). Se puede importar
              las veces que haga falta: lo que ya está cargado queda igual.
            </p>
          </div>
          <div className="survey-source__file">
            <label className="inventory-button inventory-button--primary survey-file-button">
              <Upload size={16} aria-hidden="true" />
              {file ? "Elegir otro CSV" : "Elegir CSV"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                disabled={busy}
                onChange={(event) => void handleFile(event)}
              />
            </label>
            {file && (
              <span className="survey-file-name" title={file.name}>
                <FileSpreadsheet size={14} aria-hidden="true" />
                <span>{file.name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="survey-privacy" role="note">
          <ShieldCheck size={18} aria-hidden="true" />
          <p>
            <strong>Tiene datos personales.</strong> La planilla y el CSV traen
            nombres, correos y números de línea: no los compartas fuera de IT y
            borrá el CSV descargado cuando termines.
          </p>
        </div>

        {previewMutation.isPending && !preview && (
          <div className="inventory-state" role="status">
            <Loader2 size={26} className="inventory-spin" aria-hidden="true" />
            <strong>Leyendo la planilla…</strong>
          </div>
        )}

        {error && (
          <div className="inventory-state inventory-state--error" role="alert">
            <AlertTriangle size={26} aria-hidden="true" />
            <strong>No se pudo leer la planilla</strong>
            <p>{error}</p>
          </div>
        )}

        {preview && counts && (
          <>
            {applied && (
              <div className="survey-done" role="status">
                <CheckCircle2 size={22} aria-hidden="true" />
                <div>
                  <strong>Relevamiento importado</strong>
                  {appliedLines(applied).length > 0 ? (
                    <ul>
                      {appliedLines(applied).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No había nada nuevo para cargar.</p>
                  )}
                  <div className="survey-done__links">
                    <Link
                      className="inventory-button inventory-button--ghost"
                      to="/it/inventory"
                    >
                      Ver inventario
                    </Link>
                    <Link
                      className="inventory-button inventory-button--ghost"
                      to="/it/staff"
                    >
                      Ver personal y líneas
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <section className="inventory-metrics" aria-label="Resumen">
              {[
                {
                  label: "Respuestas",
                  value: preview.responses,
                  detail: "Una por persona, la más nueva",
                  tone: undefined,
                },
                {
                  label: applied ? "Creados" : "Para crear",
                  value: counts.create,
                  detail: "Personas, equipos y líneas",
                  tone: "cyan",
                },
                {
                  label: applied
                    ? "Asignados o completados"
                    : "Para asignar o completar",
                  value: counts.assign + counts.update,
                  detail: "Lo que ya estaba en el sistema",
                  tone: "cyan",
                },
                {
                  label: "Para revisar",
                  value: counts.conflict,
                  detail: "No se tocan: resolvelos a mano",
                  tone: "amber",
                },
              ].map((metric) => (
                <article key={metric.label} data-tone={metric.tone}>
                  <div className="inventory-metric__topline">
                    <span>{metric.label}</span>
                  </div>
                  <strong>{metric.value.toLocaleString("es-AR")}</strong>
                  <p>{metric.detail}</p>
                </article>
              ))}
            </section>

            {preview.sectors.length > 0 && (
              <section
                className="survey-group"
                aria-labelledby="survey-sectors-title"
              >
                <h2 id="survey-sectors-title">Sectores</h2>
                <p className="survey-group__help">
                  Lo compartido se asigna al sector. Si un sector del formulario
                  no es uno del sistema, elegí cuál es; si queda sin sector, lo
                  compartido queda a nombre de quien lo cargó.
                </p>
                <div className="survey-sectors">
                  {preview.sectors.map((sector) => (
                    <label key={sector.value} className="survey-sector">
                      <span>
                        {sector.value}
                        <small>
                          {countLabel(
                            sector.responses,
                            "respuesta",
                            "respuestas",
                          )}
                        </small>
                      </span>
                      <select
                        value={sector.departmentId ?? ""}
                        disabled={busy || Boolean(applied)}
                        onChange={(event) =>
                          changeSector(sector.value, event.target.value)
                        }
                      >
                        <option value="">Sin sector</option>
                        {preview.departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                      {sector.source === null && (
                        <small className="survey-sector__warn">
                          No coincide con ningún sector del sistema
                        </small>
                      )}
                    </label>
                  ))}
                </div>
              </section>
            )}

            <label className="survey-toggle">
              <input
                type="checkbox"
                checked={showUnchanged}
                onChange={(event) => setShowUnchanged(event.target.checked)}
              />
              Mostrar lo que no cambia ({counts.unchanged})
            </label>

            {SURVEY_KINDS.map(({ kind, label }) => {
              const ofKind = preview.items.filter((item) => item.kind === kind);
              return (
                <ItemsGroup
                  key={kind}
                  label={label}
                  total={ofKind.length}
                  applied={Boolean(applied)}
                  items={ofKind.filter(
                    (item) => showUnchanged || item.action !== "unchanged",
                  )}
                />
              );
            })}

            {preview.issues.length > 0 && (
              <section
                className="survey-group"
                aria-labelledby="survey-issues-title"
              >
                <h2 id="survey-issues-title">
                  <AlertTriangle size={16} aria-hidden="true" />
                  Respuestas con problemas <span>{preview.issues.length}</span>
                </h2>
                <ul className="survey-issues">
                  {preview.issues.map((issue) => (
                    <li key={`${issue.row}:${issue.message}`}>
                      <small>Fila {issue.row}</small>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {preview.notes.length > 0 && (
              <section
                className="survey-group"
                aria-labelledby="survey-notes-title"
              >
                <h2 id="survey-notes-title">
                  <ClipboardList size={16} aria-hidden="true" />
                  Para cargar a mano <span>{preview.notes.length}</span>
                </h2>
                <p className="survey-group__help">
                  «Otros equipos» y las aclaraciones no se importan solos.
                </p>
                <ul className="survey-notes">
                  {preview.notes.map((note) => (
                    <li key={note.row}>
                      <strong>{note.name}</strong>
                      <small>Fila {note.row}</small>
                      {note.otherEquipment && (
                        <p>
                          <span>Otros equipos:</span> {note.otherEquipment}
                        </p>
                      )}
                      {note.comments && (
                        <p>
                          <span>Aclaración:</span> {note.comments}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!applied && (
              <div className="survey-confirm">
                <ListChecks size={20} aria-hidden="true" />
                <p>
                  {pending > 0
                    ? `Se guardan ${countLabel(pending, "cambio", "cambios")}. Lo que está para revisar no se toca.`
                    : "No hay nada nuevo para cargar."}
                </p>
                <button
                  type="button"
                  className="inventory-button inventory-button--primary"
                  disabled={pending === 0 || busy}
                  onClick={confirmImport}
                >
                  {applyMutation.isPending ? (
                    <Loader2
                      size={16}
                      className="inventory-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2 size={16} aria-hidden="true" />
                  )}
                  Importar
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
