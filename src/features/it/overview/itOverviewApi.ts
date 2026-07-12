import api from "../../../lib/api";
import type { ApiDataResponse, ItOverview } from "./types";

export const IT_OVERVIEW_QUERY_KEY = ["it", "overview"] as const;

export async function getItOverview(): Promise<ItOverview> {
  const response =
    await api.get<ApiDataResponse<ItOverview>>("/api/it/overview");

  return response.data.data;
}
