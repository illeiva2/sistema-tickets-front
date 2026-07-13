export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED";

export interface CustodyDepartment {
  id: string;
  name: string;
  slug?: string;
  color?: string | null;
  icon?: string | null;
}

export interface CustodyPerson {
  id: string;
  employeeNumber?: string | null;
  firstName: string;
  lastName: string;
  workEmail?: string | null;
  status: EmploymentStatus;
  department?: CustodyDepartment | null;
}

export interface CustodyActor {
  id: string;
  name: string;
  email: string;
}

export interface AssetAssignmentSummary {
  id: string;
  startAt: string;
  endAt?: string | null;
  person?: CustodyPerson | null;
  department?: CustodyDepartment | null;
  assignedBy?: CustodyActor | null;
}

export interface CustodyPeopleResult {
  items: CustodyPerson[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AssignAssetPayload {
  personId?: string;
  departmentId?: string;
  note?: string | null;
}

export interface ReturnAssetPayload {
  returnNote?: string | null;
}
