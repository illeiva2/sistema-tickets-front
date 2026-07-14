export const PHONE_LINE_STATUSES = [
  "ACTIVE",
  "AVAILABLE",
  "SUSPENDED",
  "CANCELLED",
] as const;

export type PhoneLineStatus = (typeof PHONE_LINE_STATUSES)[number];

export const PHONE_LINE_STATUS_LABELS: Record<PhoneLineStatus, string> = {
  ACTIVE: "En uso",
  AVAILABLE: "Disponible",
  SUSPENDED: "Suspendida",
  CANCELLED: "Cancelada",
};

export const PHONE_CARRIERS = [
  "CLARO",
  "MOVISTAR",
  "PERSONAL",
  "TUENTI",
  "OTHER",
] as const;

export type PhoneCarrier = (typeof PHONE_CARRIERS)[number];

export const PHONE_CARRIER_LABELS: Record<PhoneCarrier, string> = {
  CLARO: "Claro",
  MOVISTAR: "Movistar",
  PERSONAL: "Personal",
  TUENTI: "Tuenti",
  OTHER: "Otra",
};

export const PHONE_LINE_CURRENCIES = ["ARS", "USD"] as const;
export type PhoneLineCurrency = (typeof PHONE_LINE_CURRENCIES)[number];

export interface PhoneLinePerson {
  id: string;
  employeeNumber?: string | null;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  status?: string;
}

export interface PhoneLineAsset {
  id: string;
  type?: string;
  status?: string;
  brand: string;
  model: string;
  assetTag?: string | null;
  serialNumber?: string | null;
  assignedPersonId?: string | null;
}

export interface PhoneLineAssignment {
  id: string;
  assignedAt: string;
  returnedAt?: string | null;
  note?: string | null;
  returnNote?: string | null;
  person: PhoneLinePerson;
  asset?: PhoneLineAsset | null;
  assignedBy?: { id: string; name?: string | null; email?: string | null };
}

export interface PhoneSimChange {
  id: string;
  previousIccid?: string | null;
  newIccid: string;
  changedAt: string;
  reason?: string | null;
  notes?: string | null;
  changedBy?: { id: string; name?: string | null; email?: string | null };
  createdAt?: string;
}

export interface PhoneLine {
  id: string;
  phoneNumber: string;
  carrier: PhoneCarrier;
  carrierOther?: string | null;
  planName?: string | null;
  dataAllowanceGb?: number | null;
  monthlyCost?: number | string | null;
  currency: PhoneLineCurrency;
  simIccid?: string | null;
  status: PhoneLineStatus;
  contractEndsAt?: string | null;
  notes?: string | null;
  isActive: boolean;
  holderId?: string | null;
  holder?: PhoneLinePerson | null;
  assetId?: string | null;
  asset?: PhoneLineAsset | null;
  assignments?: PhoneLineAssignment[];
  simChanges?: PhoneSimChange[];
  createdAt?: string;
  updatedAt: string;
}

export interface PhoneLinePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PhoneLineListResult {
  items: PhoneLine[];
  pagination: PhoneLinePagination;
}

export interface PhoneLineListQuery {
  q: string;
  status: PhoneLineStatus | "";
  carrier: PhoneCarrier | "";
  page: number;
  pageSize: number;
}

export interface PhoneLineCreatePayload {
  phoneNumber: string;
  carrier: PhoneCarrier;
  carrierOther?: string | null;
  planName?: string | null;
  dataAllowanceGb?: number | null;
  monthlyCost?: number | null;
  currency?: PhoneLineCurrency;
  simIccid?: string | null;
  status?: PhoneLineStatus;
  contractEndsAt?: string | null;
  notes?: string | null;
}

export type PhoneLineUpdatePayload = Partial<PhoneLineCreatePayload> & {
  expectedUpdatedAt: string;
};

export type PhoneLineSaveCommand =
  | { mode: "create"; payload: PhoneLineCreatePayload }
  | { mode: "edit"; id: string; payload: PhoneLineUpdatePayload };

export interface PhoneLineAssignPayload {
  expectedUpdatedAt: string;
  personId: string;
  assetId?: string | null;
  note?: string | null;
}

export interface PhoneLineReturnPayload {
  expectedUpdatedAt: string;
  returnNote?: string | null;
}

export interface SimChangeCreatePayload {
  expectedUpdatedAt: string;
  newIccid: string;
  changedAt?: string;
  reason?: string;
  notes?: string;
}

export interface SimChangeListResult {
  items: PhoneSimChange[];
  pagination: PhoneLinePagination;
}
