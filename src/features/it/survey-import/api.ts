import api from "@/lib/api";
import type {
  SurveyApplyResult,
  SurveyPreview,
  SurveySectorMap,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function previewSurveyImport(
  csv: string,
  sectorMap: SurveySectorMap,
): Promise<SurveyPreview> {
  const response = await api.post<ApiEnvelope<SurveyPreview>>(
    "/api/it/survey-import/preview",
    { csv, sectorMap },
  );
  return response.data.data;
}

export async function applySurveyImport(
  csv: string,
  sectorMap: SurveySectorMap,
  expectedPlanHash: string,
): Promise<SurveyApplyResult> {
  const response = await api.post<ApiEnvelope<SurveyApplyResult>>(
    "/api/it/survey-import/apply",
    { csv, sectorMap, expectedPlanHash },
  );
  return response.data.data;
}

interface SurveyErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: { preview?: SurveyPreview };
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
  return {
    code: body?.error?.code,
    message:
      body?.error?.message ??
      (error instanceof Error && error.message
        ? error.message
        : "No se pudo leer la planilla."),
    preview: body?.error?.details?.preview,
  };
}
