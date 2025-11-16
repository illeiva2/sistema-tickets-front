// Enums
export enum UserRole {
  USER = "USER",
  AGENT = "AGENT",
  ADMIN = "ADMIN",
}

export enum TicketStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export enum TicketPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

// Base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User types
export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
}

// Ticket types
export interface Ticket extends BaseEntity {
  ticketNumber: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  assigneeId?: string;
  closedAt?: Date;
  requester?: User;
  assignee?: User;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  priority: TicketPriority;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string;
}

export interface TicketFilters {
  q?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  requesterId?: string;
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TicketSort {
  sortBy?: "createdAt" | "updatedAt" | "title" | "priority" | "status";
  sortDir?: "asc" | "desc";
}

// Comment types
export interface Comment extends BaseEntity {
  ticketId: string;
  authorId: string;
  message: string;
  author?: User;
}

export interface CreateCommentRequest {
  message: string;
}

// Attachment types
export interface Attachment extends BaseEntity {
  ticketId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
}

export interface CreateAttachmentRequest {
  file: File;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Metrics types
export interface MetricsOverview {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  avgResolutionHours: number;
  byPriority: Record<TicketPriority, number>;
  byAgent: Array<{
    agentId: string;
    agentName: string;
    count: number;
  }>;
  createdPerDay: Array<{
    date: string;
    count: number;
  }>;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  requestId?: string;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
}

// Dashboard types
export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  avgResolutionHours: number;
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

// Table types
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
}

export interface TableFilters {
  [key: string]: any;
}

export interface TableSort {
  key: string;
  direction: "asc" | "desc";
}
