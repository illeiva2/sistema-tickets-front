import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { ChevronRight, X } from "lucide-react";

export interface TourStep {
  /**
   * CSS selector del elemento al que apuntar. Si es undefined o no se
   * encuentra ningún elemento visible, el popover se renderiza centrado
   * en pantalla sin spotlight (modo "anuncio").
   */
  target?: string;
  title: string;
  description: string;
  /**
   * Lado preferido del popover relativo al target. "auto" decide segun
   * espacio disponible. Default: "auto".
   */
  placement?: "top" | "bottom" | "left" | "right" | "auto";
}

interface OnboardingTourProps {
  steps: TourStep[];
  /** localStorage key para persistir "ya visto". */
  storageKey: string;
  /**
   * Si es true, el tour se muestra ignorando el flag de localStorage.
   * Util para el boton "Ver tour de nuevo".
   */
  forceShow?: boolean;
  /** Callback cuando el tour termina o se omite. */
  onClose?: () => void;
}

const SPOTLIGHT_PADDING = 6;
const POPOVER_GAP = 12;
const POPOVER_WIDTH = 320;

// Encuentra el primer elemento que matchee el selector y este visible
// (offsetParent !== null filtra los display:none / visibility:hidden).
const findVisibleTarget = (selector: string): HTMLElement | null => {
  const all = document.querySelectorAll<HTMLElement>(selector);
  for (const el of Array.from(all)) {
    if (el.offsetParent !== null) return el;
  }
  return null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

interface PopoverPosition {
  top: number;
  left: number;
  arrow?: { top?: number; left?: number; right?: number; bottom?: number };
}

// Calcula posicion del popover dado el rect del target. Si no hay target,
// devuelve null (se renderiza centrado).
const computePopoverPosition = (
  rect: DOMRect | null,
  popoverHeight: number,
  placement: TourStep["placement"] = "auto",
): PopoverPosition | null => {
  if (!rect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 12;

  // Decide placement automatico: el lado con mas espacio.
  let actualPlacement = placement;
  if (placement === "auto") {
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = vw - rect.right;
    const spaceLeft = rect.left;
    const spaces = [
      { side: "bottom" as const, value: spaceBelow },
      { side: "top" as const, value: spaceAbove },
      { side: "right" as const, value: spaceRight },
      { side: "left" as const, value: spaceLeft },
    ];
    spaces.sort((a, b) => b.value - a.value);
    actualPlacement = spaces[0].side;
  }

  let top = 0;
  let left = 0;

  if (actualPlacement === "bottom") {
    top = rect.bottom + POPOVER_GAP;
    left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  } else if (actualPlacement === "top") {
    top = rect.top - popoverHeight - POPOVER_GAP;
    left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  } else if (actualPlacement === "right") {
    top = rect.top + rect.height / 2 - popoverHeight / 2;
    left = rect.right + POPOVER_GAP;
  } else {
    // left
    top = rect.top + rect.height / 2 - popoverHeight / 2;
    left = rect.left - POPOVER_WIDTH - POPOVER_GAP;
  }

  // Mantener dentro del viewport.
  top = clamp(top, margin, vh - popoverHeight - margin);
  left = clamp(left, margin, vw - POPOVER_WIDTH - margin);

  return { top, left };
};

const OnboardingTour: React.FC<OnboardingTourProps> = ({
  steps,
  storageKey,
  forceShow = false,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverHeight, setPopoverHeight] = useState(180);

  // Decidir si abrir el tour al montar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (forceShow) {
      setIsOpen(true);
      setCurrentIndex(0);
      return;
    }
    try {
      const seen = window.localStorage.getItem(storageKey);
      if (!seen) {
        // Esperar un poco para que la app termine de renderizar (lazy chunks,
        // contextos, etc) antes de buscar selectores.
        const t = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      // si localStorage no esta disponible, mostrar igual
      setIsOpen(true);
    }
  }, [forceShow, storageKey]);

  const currentStep = steps[currentIndex];

  // Recalcular rect del target cuando cambia el step, y ante resize/scroll.
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    const update = () => {
      if (!currentStep.target) {
        setTargetRect(null);
        return;
      }
      const el = findVisibleTarget(currentStep.target);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Si el target esta fuera de viewport, scrollearlo.
      const vh = window.innerHeight;
      if (rect.top < 60 || rect.bottom > vh - 60) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    // Inicial
    update();
    // Re-medir al popover montarse (para tener altura real)
    const t = setTimeout(update, 100);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, currentStep]);

  // Medir altura del popover para posicionarlo correctamente arriba.
  useEffect(() => {
    if (!isOpen) return;
    if (popoverRef.current) {
      setPopoverHeight(popoverRef.current.offsetHeight);
    }
  }, [isOpen, currentIndex, currentStep]);

  // ESC cierra como "omitir".
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const persistDone = () => {
    try {
      window.localStorage.setItem(storageKey, "done");
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    persistDone();
    setIsOpen(false);
    onClose?.();
  };

  const handleSkip = () => {
    persistDone();
    setIsOpen(false);
    onClose?.();
  };

  const popoverPosition = useMemo(
    () =>
      computePopoverPosition(
        targetRect,
        popoverHeight,
        currentStep?.placement,
      ),
    [targetRect, popoverHeight, currentStep],
  );

  if (!isOpen || !currentStep) return null;

  const total = steps.length;
  const isLast = currentIndex === total - 1;

  // Posicion del spotlight (target rect con padding).
  const spotlight = targetRect
    ? {
        top: targetRect.top - SPOTLIGHT_PADDING,
        left: targetRect.left - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Overlay con un agujero recortado donde esta el target. Si no hay
          target, el overlay es uniforme (oscurece toda la pantalla). */}
      {spotlight ? (
        <>
          {/* 4 marcos alrededor del rect del target */}
          <div
            className="fixed bg-black/55 transition-all duration-200 pointer-events-auto"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: spotlight.top,
            }}
          />
          <div
            className="fixed bg-black/55 transition-all duration-200 pointer-events-auto"
            style={{
              top: spotlight.top + spotlight.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className="fixed bg-black/55 transition-all duration-200 pointer-events-auto"
            style={{
              top: spotlight.top,
              left: 0,
              width: spotlight.left,
              height: spotlight.height,
            }}
          />
          <div
            className="fixed bg-black/55 transition-all duration-200 pointer-events-auto"
            style={{
              top: spotlight.top,
              left: spotlight.left + spotlight.width,
              right: 0,
              height: spotlight.height,
            }}
          />
          {/* Borde resaltado del target */}
          <div
            className="fixed rounded-md ring-2 ring-primary pointer-events-none transition-all duration-200"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/55 pointer-events-auto" />
      )}

      {/* Popover */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="fixed bg-card border border-border rounded-lg shadow-2xl pointer-events-auto"
        style={{
          width: POPOVER_WIDTH,
          ...(popoverPosition
            ? { top: popoverPosition.top, left: popoverPosition.left }
            : {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }),
        }}
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2">
          <div className="flex-1 min-w-0">
            <h3
              id="onboarding-title"
              className="text-[15px] font-semibold tracking-tight"
            >
              {currentStep.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            aria-label="Omitir tour"
            className="text-muted-foreground hover:text-foreground shrink-0 -mt-0.5"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 pb-3">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-border bg-muted/20 rounded-b-lg">
          <span className="text-[11.5px] text-muted-foreground tabular-nums">
            {currentIndex + 1} de {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSkip}
              className="text-[11.5px] text-muted-foreground hover:text-foreground"
            >
              Omitir
            </button>
            <Button
              size="sm"
              onClick={handleNext}
              className="h-7 px-3 text-[12px]"
            >
              {isLast ? "Finalizar" : "Siguiente"}
              {!isLast && <ChevronRight size={13} className="ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
