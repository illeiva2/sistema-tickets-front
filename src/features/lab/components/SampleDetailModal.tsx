import React from "react";
import { Copy, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { fmtDateTime } from "../format";
import { SITE_LABEL, copiarAlPortapapeles } from "../samples";
import type { SampleDto, SampleKindDto } from "../types";
import { LabModal } from "./LabModal";

/**
 * Ficha de una muestra. Los valores se etiquetan con el catálogo del tipo
 * (también los de campos ya desactivados, que se muestran con su key para no
 * ocultar datos cargados). Los análisis enlazados llegan en el incremento
 * siguiente; se dice, en vez de dejar un hueco que parezca un error.
 */
export const SampleDetailModal: React.FC<{
  sample: SampleDto;
  kinds: SampleKindDto[];
  canEdit: boolean;
  onEdit: (s: SampleDto) => void;
  onClose: () => void;
}> = ({ sample, kinds, canEdit, onEdit, onClose }) => {
  const kind = kinds.find((k) => k.id === sample.kindId);
  const defs = kind?.fields ?? [];

  // Primero los campos del catálogo en su orden; después cualquier valor cuyo
  // campo ya no exista, para no esconder lo que alguien cargó.
  const filas: { label: string; valor: string }[] = [];
  const usados = new Set<string>();
  for (const def of defs) {
    const v = sample.fields[def.key];
    usados.add(def.key);
    if (v === undefined || v === null || v === "") continue;
    filas.push({
      label: def.label,
      valor: def.type === "DATETIME" ? fmtDateTime(String(v)) : String(v),
    });
  }
  for (const [k, v] of Object.entries(sample.fields)) {
    if (usados.has(k) || v === undefined || v === null || v === "") continue;
    filas.push({ label: k, valor: String(v) });
  }

  const copiar = async () => {
    (await copiarAlPortapapeles(sample.accession))
      ? toast.success("Accesión copiada")
      : toast.error("No se pudo copiar");
  };

  return (
    <LabModal
      onClose={onClose}
      title={
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-mono tracking-wider">{sample.accession}</span>
          <button
            type="button"
            onClick={() => void copiar()}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Copiar accesión"
            title="Copiar accesión"
          >
            <Copy size={14} />
          </button>
        </span>
      }
      footer={
        <>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(sample)}>
              <Pencil size={13} className="mr-1.5" />
              Editar ficha
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-base font-medium">{sample.displayName}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {SITE_LABEL[sample.site]} · {sample.kind.name} · toma {fmtDateTime(sample.sampledAt)}
          </p>
        </div>

        {filas.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">Sin datos de ficha cargados.</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filas.map((f) => (
              <div key={f.label} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                <dt className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </dt>
                <dd className="text-[13.5px] font-medium mt-0.5 break-words">{f.valor}</dd>
              </div>
            ))}
          </dl>
        )}

        {sample.notes && (
          <div>
            <h4 className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">
              Notas
            </h4>
            <p className="text-[13px] whitespace-pre-wrap">{sample.notes}</p>
          </div>
        )}

        <p className="text-[11.5px] text-muted-foreground border-t border-border pt-3">
          Registró {sample.createdBy.name} el {fmtDateTime(sample.createdAt)}
          {sample.updatedAt !== sample.createdAt && ` · editada ${fmtDateTime(sample.updatedAt)}`}
        </p>

        <p className="text-[11.5px] text-muted-foreground">
          Los análisis de esta muestra (gluten, NIR, falling number, almidón dañado, alveograma)
          van a aparecer acá cuando los equipos empiecen a enlazar por accesión.
        </p>
      </div>
    </LabModal>
  );
};

export default SampleDetailModal;
