import * as React from "react";
import { cn } from "../lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className,
    )}
  >
    {icon && (
      <div className="mb-4 text-muted-foreground opacity-60">{icon}</div>
    )}
    <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
    <p className="text-muted-foreground mb-6 max-w-sm leading-relaxed">
      {description}
    </p>
    {action && <div className="flex flex-col sm:flex-row gap-3">{action}</div>}
  </div>
);

// Variantes específicas para diferentes contextos
export const TicketsEmptyState = ({ action }: { action?: React.ReactNode }) => (
  <EmptyState
    icon={<TicketIcon className="h-16 w-16" />}
    title="No hay tickets"
    description="Aún no se han creado tickets en el sistema. Crea el primero para comenzar a gestionar solicitudes de soporte."
    action={action}
  />
);

export const CommentsEmptyState = ({
  action,
}: {
  action?: React.ReactNode;
}) => (
  <EmptyState
    icon={<MessageSquareIcon className="h-16 w-16" />}
    title="Sin comentarios"
    description="Este ticket aún no tiene comentarios. Sé el primero en agregar información o actualizaciones."
    action={action}
  />
);

export const SearchEmptyState = ({ query }: { query: string }) => (
  <EmptyState
    icon={<SearchIcon className="h-16 w-16" />}
    title="No se encontraron resultados"
    description={`No se encontraron tickets que coincidan con "${query}". Intenta con otros términos de búsqueda.`}
  />
);

// Iconos simples para evitar dependencias externas
const TicketIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
    />
  </svg>
);

const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);
