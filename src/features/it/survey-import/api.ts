import api from "@/lib/api";
import type {
  SurveyApplyResult,
  SurveyCorrectionInput,
  SurveyPreview,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// Los sectores elegidos se guardan como correcciones: no hace falta mandarlos.
export async function previewSurveyImport(csv: string): Promise<SurveyPreview> {
  const response = await api.post<ApiEnvelope<SurveyPreview>>(
    "/api/it/survey-import/preview",
    { csv },
  );
  return response.data.data;
}

/** Guarda las correcciones (null deshace) y devuelve la vista previa con ellas. */
export async function saveSurveyCorrections(
  csv: string,
  corrections: SurveyCorrectionInput[],
): Promise<SurveyPreview> {
  const response = await api.put<ApiEnvelope<SurveyPreview>>(
    "/api/it/survey-import/corrections",
    { csv, corrections },
  );
  return response.data.data;
}

export async function applySurveyImport(
  csv: string,
  expectedPlanHash: string,
): Promise<SurveyApplyResult> {
  const response = await api.post<ApiEnvelope<SurveyApplyResult>>(
    "/api/it/survey-import/apply",
    { csv, expectedPlanHash },
  );
  return response.data.data;
}

interface SurveyErrorBody {
  error?: {
    code?: string;
    message?: string;
    // La vista previa nueva (409) o los campos que no validan (400).
    details?: { preview?: SurveyPreview } | Array<{ message?: string }>;
  };
}

/** Código, mensaje y, si los datos cambiaron, la vista previa nueva que manda el back. */
export function getSurveyError(error: unknown): {
  code?: string;
  message: string;
  preview?: SurveyPreview;
} {
  const body =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { data?: SurveyErrorBody } }).response?.data
      : undefined;
  const details = body?.error?.details;
  return {
    code: body?.error?.code,
    message:
      (Array.isArray(details) ? details[0]?.message : undefined) ??
      body?.error?.message ??
      (error instanceof Error && error.message
        ? error.message
        : "No se pudo leer la planilla."),
    preview: Array.isArray(details) ? undefined : details?.preview,
  };
}
