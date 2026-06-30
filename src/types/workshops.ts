import type { DepartmentMini } from "./departments";

export interface WorkshopRule {
  id: string;
  departmentId: string;
  department: DepartmentMini;
  mercadoEquals: string | null;
  keywords: string[];
  whyText: string | null;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportSummary {
  period: string;
  mode: "weekly" | "monthly" | "upcoming";
  totalRows: number;
  importedRows: number;
  discardedClosed: number;
  discardedPast: number;
  discardedOutOfRange: number;
  unclassified: number;
  byGroup: Array<{
    departmentId: string;
    departmentName: string;
    departmentSlug: string;
    count: number;
    resourceId: string | null;
    action: "created" | "updated" | "skipped";
  }>;
  dryRun: boolean;
}

export interface WorkshopImportLog {
  id: string;
  period: string;
  mode: "weekly" | "monthly" | "upcoming";
  sheetUrl: string;
  totalRows: number;
  importedRows: number;
  generatedResources: number;
  importedAt: string;
  importer: { id: string; name: string; email: string };
}
