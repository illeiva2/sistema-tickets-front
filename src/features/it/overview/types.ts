export interface ItOverviewCounts {
  people: { total: number; active: number };
  assets: { total: number; assigned: number; inRepair: number };
  managedDevices: {
    total: number;
    workstations: number;
    phones: number;
    networkInfrastructure: number;
    cameras: number;
  };
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

export type ItModuleAvailability = "available" | "limited" | "preparing";

export interface ItOverviewCoverage {
  modules: {
    inventory: ItModuleAvailability;
    people: ItModuleAvailability;
    maintenance: ItModuleAvailability;
    procurement: ItModuleAvailability;
    network: ItModuleAvailability;
    monitoring: ItModuleAvailability;
    cameras: ItModuleAvailability;
    phoneLines: ItModuleAvailability;
  };
  apiSurface: {
    overview: string;
    crud: string;
    agentGateway: string;
    telemetry: string;
    remoteControl: string;
  };
}

export interface ItOverview {
  schemaVersion: string;
  generatedAt: string;
  counts: ItOverviewCounts;
  coverage: ItOverviewCoverage;
}

export interface ApiDataResponse<T> {
  success: boolean;
  data: T;
}
