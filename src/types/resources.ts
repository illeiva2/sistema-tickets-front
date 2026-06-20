export type ResourceCategory =
  | "HOW_TO"
  | "POLICY"
  | "FAQ"
  | "ANNOUNCEMENT"
  | "GLOSSARY"
  | "LINK"
  | "OTHER";

export interface ResourceAudienceDepartment {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export interface ResourceListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: ResourceCategory;
  tags: string[];
  isPublished: boolean;
  isPinned: boolean;
  showAsModal: boolean;
  pinExpiresAt: string | null;
  viewCount: number;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; email: string } | null;
  audienceDepartments?: ResourceAudienceDepartment[];
}

export interface Resource extends ResourceListItem {
  content: string;
}

export interface ResourceSuggestion {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: ResourceCategory;
  tags: string[];
}

export interface ResourceListResponse {
  data: ResourceListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
