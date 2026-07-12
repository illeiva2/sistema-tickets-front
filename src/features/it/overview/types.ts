export interface ItOverviewCounts {
  people: { total: number; active: number };
  assets: { total: number; assigned: number; inRepair: number };
  assetAssignments: { active: number };
  maintenances: { open: number };
  suppliers: { active: number };
  purchases: { pendingApproval: number };
  phoneLines: { total: number; inUse: number };
  sites: { active: number };
  networkDevices: { total: number; active: number };
  agentDevices: { total: number; online: number };
  remoteSessions: { active: number };
}

export interface ItOverview {
  schemaVersion: string;
  generatedAt: string;
  counts: ItOverviewCounts;
}

export interface ApiDataResponse<T> {
  success: boolean;
  data: T;
}
