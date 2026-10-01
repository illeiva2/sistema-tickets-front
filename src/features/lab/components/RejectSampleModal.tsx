import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { labApi, labError, labKeys } from "../api";
import type { SampleDto } from "../types";
import { LabModal } from "./LabModal";

/**
 * Marcar un camión como rechazado. Dos cosas y nada más: el motivo (obligatorio,
 * es lo que después lee comercio) y confirmar. Se abre desde la lista y desde
 * la ficha; al guardar invalida todo lo de muestras, así la marca aparece en
 * la lista, en la ficha y en Análisis sin recargar.
 */

const MIN_MOTIVO = 3;

export const RejectSampleModal: React.FC<{
  sample: Pick<SampleDto, "id" | "accession" | "displayName">;
  onClose: () => void;
}> = ({ sample, onClose }) => {
  const qc = useQueryClient();
  const [motivo, setMotivo] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => labApi.samples.reject(sample.id, motivo.trim()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: labKeys.samplesAll });
      toast.success(`${sample.accession} marcada como rechazada`);
      onClose();
    },
    onError: (e) => toast.error(labError(e)),
  });

  const enviar = () => {
    if (motivo.trim().length < MIN_MOTIVO) {
      setError("Contá por qué se rechazó");
      return;
    }
    if (!mutation.isPending) mutation.mutate();
  };

  return (
    <LabModal
      onClose={onClose}
      title={
        <span className="flex items-center gap-2 flex-wrap">
          <Ban size={16} className="text-red-600 shrink-0" />
          Rechazar camión
          <span className="font-mono tracking-wider font-semibold">{sample.accession}</span>
        </span>
      }
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button size="sm" variant="destructive" onClick={enviar} disabled={mutation.isPending}>
            <Ban size={13} className="mr-1.5" />
            {mutation.isPending ? "Guardando…" : "Marcar rechazado"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <p className="text-[12.5px] text-muted-foreground">{sample.displayName}</p>
        <label className="block">
          <span className="block text-[11.5px] text-muted-foreground mb-1">
            Motivo del rechazo <span className="text-red-500">*</span>
          </span>
          <textarea
            autoFocus
            rows={3}
            maxLength={500}
            className="w-full px-2.5 py-2 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Olor fuerte, fusarium por encima de lo admitido, humedad…"
          />
          {error && <span className="block text-[11.5px] text-red-600 dark:text-red-400 mt-1">{error}</span>}
        </label>
        <p className="text-[11.5px] text-muted-foreground">
          Queda marcada en la lista, en la ficha y en Análisis, con tu nombre y la hora. Se puede quitar
          después desde la ficha.
        </p>
        {/* Submit invisible para que Enter con Ctrl o desde el pie envíe el formulario. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </LabModal>
  );
};

export default RejectSampleModal;
