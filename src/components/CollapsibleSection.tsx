import React, { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui";

interface CollapsibleSectionProps {
  icon?: ReactNode;
  title: string;
  /** Numero opcional al lado del titulo (ej: cantidad de archivos). */
  count?: number;
  /** Texto auxiliar a la derecha del header (ej: "Sin archivos"). */
  hint?: string;
  /** Si true, arranca abierto. Default: false (colapsado). */
  defaultOpen?: boolean;
  /** Si true, NO se renderiza el contenido cuando esta colapsado.
   *  Util para evitar fetches o trabajo costoso hasta que se expande.
   *  Default: true. */
  lazy?: boolean;
  children: ReactNode;
}

// Card colapsable. Header siempre visible con titulo + count + chevron;
// click expande/colapsa el contenido. Pensado para secciones que ocupan
// mucho espacio en el detalle del ticket (Actividad, Archivos).
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  icon,
  title,
  count,
  hint,
  defaultOpen = false,
  lazy = true,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  // Si lazy=false, montamos siempre. Si lazy=true, solo desde la primera
  // apertura (asi al cerrar no perdemos estado interno del hijo).
  const [hasMounted, setHasMounted] = useState(defaultOpen);

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && !hasMounted) setHasMounted(true);
      return next;
    });
  };

  return (
    <Card>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className="text-muted-foreground shrink-0">{icon}</span>
          )}
          <span className="text-base font-semibold tracking-tight truncate">
            {title}
          </span>
          {typeof count === "number" && (
            <span className="text-[11.5px] font-mono tabular-nums text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5 shrink-0">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hint && (
            <span className="text-[11.5px] text-muted-foreground hidden sm:inline">
              {hint}
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>
      {(lazy ? hasMounted : true) && (
        <div className={open ? "" : "hidden"}>
          <CardContent className="px-4 pt-0 pb-4">{children}</CardContent>
        </div>
      )}
    </Card>
  );
};

export default CollapsibleSection;
