import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import {
  Download,
  RefreshCcw,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings,
} from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import type {
  ImportSummary,
  WorkshopImportLog,
} from "../types/workshops";

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1ctAMg0igaPqPdo6wP3tKOPuJS3RyCxQSXVLsb3BF5dQ/edit?gid=422568149#gid=422568149";

const AdminWorkshopsImportPage: React.FC = () => {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [mode, setMode] = useState<"weekly" | "monthly">("monthly");
  const [dryRun, setDryRun] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastSummary, setLastSummary] = useState<ImportSummary | null>(null);

  const [history, setHistory] = useState<WorkshopImportLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const resp = await api.get("/api/workshops/imports");
      setHistory(resp.data?.data ?? []);
    } catch {
      // silencio
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleImport = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Ingresá la URL del Google Sheet");
      return;
    }
    try {
      setImporting(true);
      setLastSummary(null);
      const resp = await api.post("/api/workshops/import", {
        sheetUrl: sheetUrl.trim(),
        mode,
        dryRun,
      });
      const summary: ImportSummary = resp.data?.data;
      setLastSummary(summary);
      toast.success(
        dryRun
          ? "Vista previa generada"
          : `Importados ${summary.importedRows} workshops en ${summary.byGroup.length} sector(es)`,
      );
      if (!dryRun) loadHistory();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "Error al importar el sheet",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Download size={20} className="text-primary" />
            Workshops IMAS — Importar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trae los workshops desde el Google Sheet y los publica como
            novedades por sector. Idempotente: si reimportás el mismo
            período, se actualizan los avisos existentes.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/workshops/rules">
            <Settings size={14} className="mr-1.5" />
            Reglas de clasificación
          </Link>
        </Button>
      </div>

      <div className="border border-border rounded-lg p-4 bg-card space-y-3">
        <div className="space-y-1">
          <label className="text-[12.5px] font-medium text-muted-foreground">
            URL del Google Sheet
          </label>
          <input
            type="url"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
          />
          <p className="text-[11px] text-muted-foreground">
            El sheet debe estar compartido como{" "}
            <span className="font-medium">
              &quot;Cualquiera con el enlace puede ver&quot;
            </span>
            .
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[12.5px] font-medium text-muted-foreground">
              Modo
            </label>
            <div className="flex gap-2">
              {(["monthly", "weekly"] as const).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted/40"
                    }`}
                  >
                    {m === "monthly" ? "📅 Mensual (resto del mes)" : "📆 Semanal (próximos 7 días)"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[12.5px] font-medium text-muted-foreground">
              Opciones
            </label>
            <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-background cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              <span className="text-sm">
                Vista previa{" "}
                <span className="text-muted-foreground text-[11.5px]">
                  (no crea novedades)
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleImport} disabled={importing}>
            {importing ? (
              <>
                <RefreshCcw size={14} className="mr-1.5 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Download size={14} className="mr-1.5" />
                {dryRun ? "Generar vista previa" : "Importar y publicar"}
              </>
            )}
          </Button>
        </div>
      </div>

      {lastSummary && <SummaryPanel summary={lastSummary} />}

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CalendarClock size={14} />
            Historial de importaciones
          </h2>
          <button
            type="button"
            onClick={loadHistory}
            className="text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <RefreshCcw size={11} />
            Refrescar
          </button>
        </div>
        {loadingHistory ? (
          <div className="p-4 text-sm text-muted-foreground">Cargando…</div>
        ) : history.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No hay importaciones registradas todavía.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li
                key={h.id}
                className="px-4 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {h.period} — {h.mode === "weekly" ? "Semanal" : "Mensual"}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground truncate">
                    {h.totalRows} filas · {h.importedRows} importadas ·{" "}
                    {h.generatedResources} avisos generados · por{" "}
                    {h.importer.name}
                  </div>
                </div>
                <div className="text-[11.5px] text-muted-foreground shrink-0 tabular-nums">
                  {new Date(h.importedAt).toLocaleString("es-AR")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const SummaryPanel: React.FC<{ summary: ImportSummary }> = ({ summary }) => {
  return (
    <div className="border border-primary/30 rounded-lg p-4 bg-primary/5 space-y-3">
      <div className="flex items-center gap-2">
        {summary.dryRun ? (
          <AlertCircle size={16} className="text-amber-600" />
        ) : (
          <CheckCircle2 size={16} className="text-emerald-600" />
        )}
        <h3 className="text-sm font-semibold">
          {summary.dryRun
            ? "Vista previa generada (no se crearon avisos)"
            : "Importación completada"}
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <Metric label="Total filas" value={summary.totalRows} />
        <Metric label="Importados" value={summary.importedRows} tone="ok" />
        <Metric
          label="Descartados"
          value={
            summary.discardedClosed +
            summary.discardedPast +
            summary.discardedOutOfRange
          }
          tone="muted"
        />
        <Metric
          label="Sin clasificar"
          value={summary.unclassified}
          tone={summary.unclassified > 0 ? "warn" : "muted"}
        />
      </div>
      <div className="text-[11.5px] text-muted-foreground">
        Descartes: {summary.discardedClosed} cerrados/agotados,{" "}
        {summary.discardedPast} ya pasaron, {summary.discardedOutOfRange} fuera
        del rango del modo seleccionado.
      </div>

      <div className="border-t border-primary/20 pt-3">
        <h4 className="text-[12.5px] font-medium mb-2">
          Aviso generado por sector
        </h4>
        {summary.byGroup.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ningún workshop matcheó algún sector.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {summary.byGroup.map((g) => (
              <li
                key={g.departmentId}
                className="flex items-center justify-between gap-2 text-[12.5px]"
              >
                <span className="flex-1 min-w-0 truncate">
                  <span className="font-medium">{g.departmentName}</span>
                  <span className="text-muted-foreground"> · {g.count} workshop(s)</span>
                </span>
                <span
                  className={`shrink-0 text-[10.5px] px-1.5 py-0.5 rounded-md border ${
                    g.action === "created"
                      ? "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-300"
                      : g.action === "updated"
                        ? "border-sky-300/60 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:border-sky-800/60 dark:text-sky-300"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {g.action === "created"
                    ? "Creado"
                    : g.action === "updated"
                      ? "Actualizado"
                      : "Vista previa"}
                </span>
                {g.resourceId && (
                  <Link
                    to={`/resources/${g.resourceId}`}
                    className="shrink-0 text-primary hover:underline inline-flex items-center gap-0.5 text-[11px]"
                  >
                    Ver
                    <ExternalLink size={10} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const Metric: React.FC<{
  label: string;
  value: number;
  tone?: "ok" | "warn" | "muted";
}> = ({ label, value, tone }) => {
  const color =
    tone === "ok"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "text-amber-700 dark:text-amber-300"
        : tone === "muted"
          ? "text-muted-foreground"
          : "";
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${color}`}>
        {value}
      </div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
};

export default AdminWorkshopsImportPage;
