import React from "react";
import { fechaAplicable } from "@/features/lab/format";

/** Lo que se espera después de la última tecla antes de pedir datos: el año son cuatro teclas seguidas. */
const PAUSA_MS = 500;

/**
 * Campo de fecha para un filtro que le pide datos al servidor.
 *
 * El campo de fecha del navegador cambia de valor con cada tecla: con el día o
 * el mes a medio escribir queda vacío —para el filtro, "sin fecha": el registro
 * entero— y el año pasa por 0002, 0020 y 0202 antes de llegar a 2026. Aplicando
 * cada valor, tipear 01/09/2026 eran seis consultas y la grilla redibujada otras
 * tantas veces: la página se colgaba.
 *
 * Acá el campo muestra lo que se tipea, pero el filtro se aplica recién con una
 * fecha completa y razonable (`fechaAplicable`), después de una pausa corta; al
 * salir del campo o con Enter, en el momento. Vaciarlo quita el filtro; si al
 * salir quedó una fecha a medio tipear, el campo vuelve a la que está aplicada.
 */
export const FiltroFecha: React.FC<{
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const [borrador, setBorrador] = React.useState(value ?? "");
  const timer = React.useRef<number | null>(null);
  // El aplicado y el callback más nuevos: el temporizador no debe usar los de cuando se programó.
  const actual = React.useRef({ value, onChange });
  actual.current = { value, onChange };

  // Lo aplicado puede cambiar desde afuera ("Limpiar"): el campo lo sigue.
  React.useEffect(() => setBorrador(value ?? ""), [value]);

  const cancelar = React.useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);
  React.useEffect(() => cancelar, [cancelar]);

  const aplicar = (v: string) => {
    cancelar();
    const siguiente = v === "" ? undefined : v;
    if (siguiente !== actual.current.value) actual.current.onChange(siguiente);
  };

  /**
   * Vacío puede ser "lo borré" o "estoy a medio tipear": el navegador marca lo
   * segundo con `badInput` (hay algo escrito que todavía no es una fecha).
   */
  const sePuedeAplicar = (input: HTMLInputElement) =>
    fechaAplicable(input.value) || (input.value === "" && !input.validity?.badInput);

  return (
    <input
      type="date"
      className={className}
      value={borrador}
      onChange={(e) => {
        setBorrador(e.target.value);
        cancelar();
        if (sePuedeAplicar(e.target)) {
          const v = e.target.value;
          timer.current = window.setTimeout(() => aplicar(v), PAUSA_MS);
        }
      }}
      onBlur={(e) => {
        if (sePuedeAplicar(e.target)) aplicar(e.target.value);
        else {
          cancelar();
          setBorrador(actual.current.value ?? "");
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && sePuedeAplicar(e.currentTarget)) aplicar(e.currentTarget.value);
      }}
    />
  );
};
