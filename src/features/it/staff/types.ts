export const EMPLOYMENT_STATUSES = [
  "ACTIVE",
  "ON_LEAVE",
  "TERMINATED",
] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  ACTIVE: "Activo",
  ON_LEAVE: "De licencia",
  TERMINATED: "Desvinculado",
};

export interface StaffDepartment {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

export interface StaffPerson {
  id: string;
  employeeNumber?: string | null;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  workEmail?: string | null;
  workPhone?: string | null;
  departmentId?: string | null;
  department?: StaffDepartment | null;
  status: EmploymentStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt: string;
}

export interface StaffPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface StaffListResult {
  items: StaffPerson[];
  pagination: StaffPagination;
}

export interface StaffListQuery {
  q: string;
  status: EmploymentStatus | "";
  departmentId: string;
  page: number;
  pageSize: number;
}

export interface StaffCreatePayload {
  employeeNumber?: string | null;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  workEmail?: string | null;
  workPhone?: string | null;
  departmentId?: string | null;
  status: EmploymentStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

export interface StaffUpdatePayload extends StaffCreatePayload {
  expectedUpdatedAt: string;
}

export type StaffSaveCommand =
  | { mode: "create"; payload: StaffCreatePayload }
  | { mode: "edit"; id: string; payload: StaffUpdatePayload };
