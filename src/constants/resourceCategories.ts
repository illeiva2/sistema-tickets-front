import type { ResourceCategory } from "../types/resources";

export const RESOURCE_CATEGORY_LABEL: Record<ResourceCategory, string> = {
  HOW_TO: "Cómo hacer",
  POLICY: "Política",
  FAQ: "FAQ",
  ANNOUNCEMENT: "Aviso",
  GLOSSARY: "Glosario",
  LINK: "Enlace",
  OTHER: "Otro",
};

export const RESOURCE_CATEGORY_GLYPH: Record<ResourceCategory, string> = {
  HOW_TO: "📘",
  POLICY: "📜",
  FAQ: "❔",
  ANNOUNCEMENT: "📢",
  GLOSSARY: "🔤",
  LINK: "🔗",
  OTHER: "📄",
};

export const RESOURCE_CATEGORY_STYLE: Record<ResourceCategory, string> = {
  HOW_TO:
    "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800/60",
  POLICY:
    "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800/60",
  FAQ: "text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950/30 dark:border-violet-800/60",
  ANNOUNCEMENT:
    "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/30 dark:border-rose-800/60",
  GLOSSARY:
    "text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950/30 dark:border-cyan-800/60",
  LINK: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800/60",
  OTHER: "text-muted-foreground bg-muted border-border",
};

export const ALL_RESOURCE_CATEGORIES: ResourceCategory[] = [
  "HOW_TO",
  "POLICY",
  "FAQ",
  "ANNOUNCEMENT",
  "GLOSSARY",
  "LINK",
  "OTHER",
];

export const categoryLabel = (cat?: string | null): string =>
  (cat && RESOURCE_CATEGORY_LABEL[cat as ResourceCategory]) || "—";
