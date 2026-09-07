import React from "react";
import { X } from "lucide-react";

/**
 * Modal del módulo de laboratorio. Inline, siguiendo el patrón del repo (no hay
 * componente Dialog compartido). Escape cierra y se bloquea el scroll del
 * fondo mientras está abierto. En pantallas chicas ocupa casi todo el alto y
 * el pie queda pegado abajo, para que los botones no se pierdan al scrollear.
 */
export const LabModal: React.FC<{
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}> = ({ onClose, title, children, footer, wide = false }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 px-3 py-4"
      onClick={onClose}
    >
      <div
        className={`bg-card border border-border rounded-lg shadow-2xl w-full ${
          wide ? "max-w-3xl" : "max-w-2xl"
        } max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
          <h3 className="text-base font-semibold min-w-0">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto min-h-0">{children}</div>

        {footer && (
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex flex-wrap items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default LabModal;
