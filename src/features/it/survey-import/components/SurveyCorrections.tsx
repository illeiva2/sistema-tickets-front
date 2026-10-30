import { Undo2, Wand2 } from "lucide-react";
import type { SurveyCorrection, SurveyCorrectionInput } from "../types";

const GROUPS: Array<{ scope: SurveyCorrection["scope"]; label: string }> = [
  { scope: "hostname", label: "Nombres de computadora" },
  { scope: "computer", label: "Marca y modelo de computadoras" },
  { scope: "phone", label: "Marca y modelo de celulares" },
  { scope: "number", label: "Números" },
];

export const FIX_SOURCE_LABELS: Record<SurveyCorrection["source"], string> = {
  auto: "Automática",
  manual: "A mano",
};

/** Lo que guarda deshacer: la corrección a mano se borra (null); la automática del nombre, se deja como lo escribieron. */
function undoOf(correction: SurveyCorrection): SurveyCorrectionInput | null {
  if (correction.source === "manual") {
    return { scope: correction.scope, key: correction.key, value: null };
  }
  return correction.undo
    ? { scope: "hostname", key: correction.key, value: correction.undo }
    : null;
}

/**
 * Todas las correcciones de la vista previa, para revisarlas de un vistazo y
 * deshacerlas. Las del autocorrector de marca y modelo se cambian con el lápiz
 * de cada ítem.
 */
export function SurveyCorrections({
  corrections,
  disabled,
  readOnly,
  onSave,
}: {
  corrections: SurveyCorrection[];
  disabled: boolean;
  // Después de importar: solo se muestran.
  readOnly: boolean;
  onSave: (corrections: SurveyCorrectionInput[]) => void;
}) {
  if (corrections.length === 0) return null;
  const manual = corrections.filter(
    (correction) => correction.source === "manual",
  ).length;
  return (
    <section
      className="survey-group survey-corrections"
      aria-labelledby="survey-corrections-title"
    >
      <h2 id="survey-corrections-title">
        <Wand2 size={16} aria-hidden="true" />
        Correcciones <span>{corrections.length}</span>
      </h2>
      <p className="survey-group__help">
        El autocorrector lleva los nombres al estándar PUESTO### y escribe igual
        las marcas y los modelos
        {manual > 0 ? "; lo corregido a mano queda guardado" : ""}. Cada
        corrección vale para todas las respuestas que dicen lo mismo, también en
        las próximas importaciones.
      </p>
      {GROUPS.map(({ scope, label }) => {
        const list = corrections.filter(
          (correction) => correction.scope === scope,
        );
        if (list.length === 0) return null;
        return (
          <div key={scope} className="survey-corrections__group">
            <h3>{label}</h3>
            <ul>
              {list.map((correction) => {
                const undo = readOnly ? null : undoOf(correction);
                const change = `«${correction.from}» → ${correction.to}`;
                return (
                  <li
                    key={`${correction.source}:${correction.key}:${correction.from}`}
                  >
                    <span
                      className="survey-fix-source"
                      data-source={correction.source}
                    >
                      {FIX_SOURCE_LABELS[correction.source]}
                    </span>
                    <span className="survey-corrections__change">
                      «{correction.from}» → <strong>{correction.to}</strong>
                    </span>
                    <small>
                      {correction.responses === 1
                        ? "1 respuesta"
                        : `${correction.responses} respuestas`}
                    </small>
                    {undo && (
                      <button
                        type="button"
                        className="inventory-button inventory-button--ghost"
                        disabled={disabled}
                        aria-label={
                          correction.source === "manual"
                            ? `Deshacer ${change}`
                            : `Dejar «${correction.from}» como estaba`
                        }
                        onClick={() => onSave([undo])}
                      >
                        <Undo2 size={14} aria-hidden="true" />
                        {correction.source === "manual"
                          ? "Deshacer"
                          : "Dejar como estaba"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
