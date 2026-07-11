import React from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";

/**
 * Esqueleto compartido de las páginas de Gestión IT que todavía no tienen
 * backend: título + descripción del módulo, lista de lo que va a incluir
 * y una o dos secciones con empty-state elegante. La idea es que la
 * sección se pueda recorrer completa sin que nada parezca roto.
 */

export interface ItPlaceholderSection {
  icon: React.ReactNode;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
}

interface ItModulePlaceholderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  sections: ItPlaceholderSection[];
}

export const ItModulePlaceholder: React.FC<ItModulePlaceholderProps> = ({
  icon,
  title,
  description,
  features,
  sections,
}) => (
  <div className="space-y-6">
    {/* Encabezado del módulo */}
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <Badge variant="secondary">En preparación</Badge>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </div>

    {/* Qué va a tener el módulo */}
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Qué vas a encontrar acá</CardTitle>
        <CardDescription>
          El módulo se activa en una próxima etapa. Esto es lo que va a
          incluir:
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-primary/70"
                aria-hidden
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>

    {/* Secciones con empty-state */}
    <div
      className={
        sections.length > 1 ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"
      }
    >
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={section.icon}
              title={section.emptyTitle}
              description={section.emptyDescription}
              className="py-8"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default ItModulePlaceholder;
