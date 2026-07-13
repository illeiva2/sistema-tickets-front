export const AGENT_CONNECTION_STATES = ["ONLINE", "OFFLINE"] as const;
export type AgentConnectionState = (typeof AGENT_CONNECTION_STATES)[number];
export const AGENT_OPERATIONAL_STATES = ["ONLINE", "STALE", "OFFLINE"] as const;
export type AgentOperationalState = (typeof AGENT_OPERATIONAL_STATES)[number];
export type AgentHealthState = "HEALTHY" | "DEGRADED" | "OFFLINE" | "REVOKED";
export type RemoteProtocol = "SSH" | "VNC";
export type RemoteSessionStatus = "ACTIVE" | "CLOSED" | "ERROR";

export interface AgentAsset {
  id: string;
  assetTag?: string | null;
  serialNumber?: string | null;
  brand?: string;
  model?: string;
  type?: string;
}

export interface AgentMetricSample {
  id?: string;
  cpuPct?: number | null;
  ramUsedMb?: number | null;
  ramTotalMb?: number | null;
  diskUsedPct?: number | null;
  batteryPct?: number | null;
  sampledAt: string;
}

export interface AgentInventorySnapshot {
  id: string;
  deviceId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AgentOperator {
  id: string;
  name: string;
  email?: string;
}

export interface RemoteSession {
  id: string;
  deviceId: string;
  userId?: string;
  user?: AgentOperator;
  protocol?: RemoteProtocol;
  kind?: RemoteProtocol;
  status: RemoteSessionStatus;
  clientIp?: string | null;
  targetHost?: string | null;
  startedAt: string;
  endedAt?: string | null;
  errorMsg?: string | null;
}

export interface AgentDevice {
  id: string;
  machineId?: string;
  hostname: string;
  agentVersion?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  connState: AgentConnectionState;
  state: AgentOperationalState;
  lastSeenAt?: string | null;
  lastEnrolledAt?: string;
  loggedInUser?: string | null;
  primaryIp?: string | null;
  primaryMac?: string | null;
  uptimeSec?: number | null;
  cpuPct?: number | null;
  ramUsedMb?: number | null;
  ramTotalMb?: number | null;
  batteryPct?: number | null;
  batteryCharging?: boolean | null;
  vncRunning: boolean;
  sshRunning: boolean;
  isActive: boolean;
  assetId?: string | null;
  asset?: AgentAsset | null;
  recentMetrics?: AgentMetricSample[];
  latestSnapshot?: Pick<AgentInventorySnapshot, "id" | "createdAt"> | null;
  recentSessions?: RemoteSession[];
  activeSessions?: RemoteSession[];
  createdAt?: string;
  updatedAt: string;
}

export interface AgentFleetSummary {
  total: number;
  online: number;
  offline: number;
  degraded: number;
  lowBattery: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AgentDeviceListResult {
  items: AgentDevice[];
  pagination: Pagination;
  summary?: AgentFleetSummary;
}

export interface AgentDeviceListQuery {
  q: string;
  state: AgentOperationalState | "";
  isActive: "" | "true" | "false";
  page: number;
  pageSize: number;
}

export interface AgentEnrollmentToken {
  id: string;
  label?: string | null;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  remainingUses: number;
  usedAt?: string | null;
  revokedAt?: string | null;
  status: "AVAILABLE" | "USED" | "EXPIRED" | "REVOKED";
  usedByDeviceId?: string | null;
  usedByDevice?: Pick<AgentDevice, "id" | "hostname"> | null;
  enrolledDevices?: Array<Pick<AgentDevice, "id" | "hostname" | "isActive">>;
  createdBy?: AgentOperator;
  createdAt: string;
}

export interface AgentEnrollmentTokenResult {
  token: AgentEnrollmentToken;
  plainToken: string;
}

export interface EnrollmentTokenPayload {
  label?: string;
  expiresAt?: string;
  maxUses?: number;
}

export interface RemoteConnection {
  protocol: RemoteProtocol;
  target: string;
  port: number;
  uri?: string | null;
  warning: string;
  scope: "DIRECT";
  requiresNetworkReachability: true;
}

export interface RemoteSessionStartResult {
  session: RemoteSession;
  connection: RemoteConnection;
}

export interface AgentAssetSearchResult {
  items: AgentAsset[];
  pagination?: Pagination;
}

export interface AgentLookups {
  assets: AgentAsset[];
}

export function getAgentHealth(device: AgentDevice): AgentHealthState {
  if (!device.isActive) return "REVOKED";
  if (device.state === "OFFLINE") return "OFFLINE";
  if (device.state === "STALE") return "DEGRADED";
  const ramPct =
    device.ramTotalMb && device.ramUsedMb != null
      ? device.ramUsedMb / device.ramTotalMb
      : 0;
  if (
    (device.cpuPct ?? 0) >= 90 ||
    ramPct >= 0.9 ||
    ((device.batteryPct ?? 100) < 20 && !device.batteryCharging)
  )
    return "DEGRADED";
  return "HEALTHY";
}
