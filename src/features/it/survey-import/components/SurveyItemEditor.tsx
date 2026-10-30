import { useState, type FormEvent } from "react";
import { Check, Loader2, X } from "lucide-react";
import { ASSET_TAG_PATTERN } from "@/features/it/inventory/types";
import { getSurveyError } from "../api";
import type { SurveyCorrectionInput, SurveyEdit } from "../types";

const draftKey = (edit: SurveyEdit, field: string) =>
  `${edit.scope}:${edit.key}:${field}`;

function initialDraft(edits: SurveyEdit[]): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const edit of edits) {
    if (edit.scope === "hostname") {
      draft[draftKey(edit, "tag")] = edit.tag;
    } else if (edit.scope === "number") {
      draft[draftKey(edit, "number")] = edit.number;
    } else {
      draft[draftKey(edit, "brand")] = edit.brand;
      draft[draftKey(edit, "model")] = edit.model;
    }
  }
  return draft;
}

/** A cuántas respuestas les cambia, si es más de una. */
function reach(edit: SurveyEdit): string | null {
  if (edit.responses < 2) return null;
  const value =
    edit.scope === "phone" || edit.scope === "computer"
      ? [edit.brand, edit.model].filter(Boolean).join(" ")
      : edit.from;
  return `Cambia las ${edit.responses} respuestas con «${value}».`;
}

/**
 * Corrección a mano de un ítem de la vista previa: nombre, marca y modelo o
 * número. Se guarda por lo que escribieron: vale para todas las respuestas que
 * dicen lo mismo y para las próximas importaciones.
 */
export function SurveyItemEditor({
  edits,
  saving,
  onSave,
  onCancel,
}: {
  edits: SurveyEdit[];
  saving: boolean;
  onSave: (corrections: SurveyCorrectionInput[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => initialDraft(edits));
  const [error, setError] = useState<string | null>(null);
  const hostnames = edits.filter((edit) => edit.scope === "hostname").length;

  const input = (edit: SurveyEdit, name: string) => ({
    value: draft[draftKey(edit, name)] ?? "",
    disabled: saving,
    autoComplete: "off",
    onChange: (event: { target: { value: string } }) =>
      setDraft((current) => ({
        ...current,
        [draftKey(edit, name)]: event.target.value,
      })),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const corrections: SurveyCorrectionInput[] = [];
    for (const edit of edits) {
      if (edit.scope === "hostname") {
        const tag = draft[draftKey(edit, "tag")].trim().toUpperCase();
        if (!ASSET_TAG_PATTERN.test(tag)) {
          setError(
            "El nombre de la PC lleva letras, números y guiones (de 3 a 32).",
          );
          return;
        }
        if (tag !== edit.tag.toUpperCase()) {
          corrections.push({
            scope: "hostname",
            key: edit.key,
            value: { tag },
          });
        }
      } else if (edit.scope === "number") {
        const number = draft[draftKey(edit, "number")].trim();
        if (!number) {
          setError("Falta el número.");
          return;
        }
        if (number !== edit.number) {
          corrections.push({
            scope: "number",
            key: edit.key,
            value: { number },
          });
        }
      } else {
        const brand = draft[draftKey(edit, "brand")].trim();
        const model = draft[draftKey(edit, "model")].trim();
        if (!brand || !model) {
          setError("Faltan la marca o el modelo.");
          return;
        }
        if (brand !== edit.brand || model !== edit.model) {
          corrections.push({
            scope: edit.scope,
            key: edit.key,
            value: { brand, model },
          });
        }
      }
    }
    if (corrections.length === 0) {
      onCancel();
      return;
    }
    setError(null);
    try {
      await onSave(corrections);
    } catch (saveError) {
      setError(getSurveyError(saveError).message);
    }
  };

  return (
    <form
      className="survey-editor"
      aria-label="Corregir"
      onSubmit={(event) => void submit(event)}
    >
      {edits.map((edit) => {
        const help = reach(edit);
        if (edit.scope === "hostname") {
          return (
            <div key={draftKey(edit, "tag")} className="survey-editor__field">
              <label>
                <span>
                  Nombre de la PC
                  {hostnames > 1 && <em> · escribieron «{edit.from}»</em>}
                </span>
                <input {...input(edit, "tag")} spellCheck={false} />
              </label>
              {help && <small>{help}</small>}
            </div>
          );
        }
        if (edit.scope === "number") {
          return (
            <div
              key={draftKey(edit, "number")}
              className="survey-editor__field"
            >
              <label>
                <span>Número</span>
                <input {...input(edit, "number")} inputMode="tel" />
              </label>
              {help && <small>{help}</small>}
            </div>
          );
        }
        return (
          <div key={draftKey(edit, "device")} className="survey-editor__field">
            <div className="survey-editor__device">
              <label>
                <span>Marca</span>
                <input {...input(edit, "brand")} maxLength={100} />
              </label>
              <label>
                <span>Modelo</span>
                <input {...input(edit, "model")} maxLength={150} />
              </label>
            </div>
            {help && <small>{help}</small>}
          </div>
        );
      })}
      {error && (
        <p className="survey-editor__error" role="alert">
          {error}
        </p>
      )}
      <div className="survey-editor__actions">
        <button
          type="submit"
          className="inventory-button inventory-button--primary"
          disabled={saving}
        >
          {saving ? (
            <Loader2 size={14} className="inventory-spin" aria-hidden="true" />
          ) : (
            <Check size={14} aria-hidden="true" />
          )}
          Guardar
        </button>
        <button
          type="button"
          className="inventory-button inventory-button--ghost"
          disabled={saving}
          onClick={onCancel}
        >
          <X size={14} aria-hidden="true" />
          Cancelar
        </button>
      </div>
    </form>
  );
}
