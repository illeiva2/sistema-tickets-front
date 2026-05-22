export type ProjectStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED";

export interface ProjectUserMini {
  id: string;
  name: string;
  email: string;
}

export interface ProjectListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  description: string;
  status: ProjectStatus;
  progressPercent: number | null;
  startedAt: string | null;
  expectedEndAt: string | null;
  completedAt: string | null;
  isPublished: boolean;
  isPinned: boolean;
  leadId: string;
  createdAt: string;
  updatedAt: string;
  lead: ProjectUserMini;
  team: ProjectUserMini[];
}

export interface ProjectListResponse {
  data: ProjectListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
