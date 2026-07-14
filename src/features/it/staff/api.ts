import api from "@/lib/api";
import type {
  StaffCreatePayload,
  StaffDepartment,
  StaffListQuery,
  StaffListResult,
  StaffPerson,
  StaffUpdatePayload,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type PersonResultData =
  | StaffPerson
  | { person: StaffPerson }
  | { item: StaffPerson };

type DepartmentsResultData =
  | StaffDepartment[]
  | { items: StaffDepartment[] }
  | { departments: StaffDepartment[] };

function unwrapPerson(data: PersonResultData): StaffPerson {
  if ("person" in data) return data.person;
  if ("item" in data) return data.item;
  return data;
}

function unwrapDepartments(data: DepartmentsResultData): StaffDepartment[] {
  if (Array.isArray(data)) return data;
  if ("items" in data) return data.items;
  return data.departments;
}

export async function fetchPeople(
  query: StaffListQuery,
): Promise<StaffListResult> {
  const response = await api.get<ApiEnvelope<StaffListResult>>(
    "/api/it/people",
    {
      params: {
        q: query.q || undefined,
        status: query.status || undefined,
        departmentId: query.departmentId || undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
    },
  );
  return response.data.data;
}

export async function fetchPerson(id: string): Promise<StaffPerson> {
  const response = await api.get<ApiEnvelope<PersonResultData>>(
    `/api/it/people/${id}`,
  );
  return unwrapPerson(response.data.data);
}

export async function createPerson(
  payload: StaffCreatePayload,
): Promise<StaffPerson> {
  const response = await api.post<ApiEnvelope<PersonResultData>>(
    "/api/it/people",
    payload,
  );
  return unwrapPerson(response.data.data);
}

export async function updatePerson(
  id: string,
  payload: StaffUpdatePayload,
): Promise<StaffPerson> {
  const response = await api.patch<ApiEnvelope<PersonResultData>>(
    `/api/it/people/${id}`,
    payload,
  );
  return unwrapPerson(response.data.data);
}

export async function fetchStaffDepartments(): Promise<StaffDepartment[]> {
  const response =
    await api.get<ApiEnvelope<DepartmentsResultData>>("/api/departments");
  return unwrapDepartments(response.data.data);
}

export interface StaffErrorInfo {
  message: string;
  isConflict: boolean;
}

export function getStaffErrorInfo(error: unknown): StaffErrorInfo {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: {
            error?: { code?: string; message?: string };
            message?: string;
          };
        };
      }
    ).response;
    const apiMessage =
      response?.data?.error?.message ?? response?.data?.message;
    return {
      message: apiMessage || "No se pudo completar la operación de personal.",
      isConflict:
        response?.status === 409 &&
        response?.data?.error?.code === "PERSON_VERSION_CONFLICT",
    };
  }

  return {
    message:
      error instanceof Error && error.message
        ? error.message
        : "No se pudo completar la operación de personal.",
    isConflict: false,
  };
}
