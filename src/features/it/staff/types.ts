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

// Vistas parciales que devuelve GET /api/it/people/:id además de la ficha.
// Los catálogos de tipo/estado viven en inventory y phone-lines; acá se
// tipan como string para no acoplar el padrón a esos módulos.
export interface StaffAssetPreview {
  id: string;
  assetTag: string;
  type: string;
  status: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  updatedAt?: string;
}

export interface StaffPhoneLinePreview {
  id: string;
  phoneNumber: string;
  carrier: string;
  carrierOther?: string | null;
  planName?: string | null;
  status: string;
  contractEndsAt?: string | null;
}

export interface StaffAssetAssignment {
  id: string;
  startAt: string;
  endAt?: string | null;
  asset?: StaffAssetPreview | null;
  department?: StaffDepartment | null;
}

export interface StaffPhoneLineAssignment {
  id: string;
  assignedAt: string;
  returnedAt?: string | null;
  phoneLine?: StaffPhoneLinePreview | null;
  asset?: StaffAssetPreview | null;
}

export interface StaffPersonDetail extends StaffPerson {
  assignedAssets?: StaffAssetPreview[];
  phoneLines?: StaffPhoneLinePreview[];
  assetAssignments?: StaffAssetAssignment[];
  phoneLineAssignments?: StaffPhoneLineAssignment[];
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
