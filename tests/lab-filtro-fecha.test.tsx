import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FiltroFecha } from "../src/features/lab/components/FiltroFecha";

/** Lo que emite el campo de fecha de Chrome al tipear 01/09/2026 sobre 20/09/2026, tecla por tecla. */
const TIPEO_01_09_2026 = ["", "2026-09-01", "", "2026-09-01", "0002-09-01", "0020-09-01", "0202-09-01", "2026-09-01"];

const montar = (value: string | undefined = "2026-09-20") => {
  const onChange = vi.fn();
  const vista = render(
    <label>
      Desde
      <FiltroFecha value={value} onChange={onChange} />
    </label>,
  );
  return { onChange, input: screen.getByLabelText("Desde") as HTMLInputElement, ...vista };
};

/** Simula un campo con algo escrito que todavía no es una fecha (un segmento a medias). */
const aMedioTipear = (input: HTMLInputElement) =>
  Object.defineProperty(input, "validity", { configurable: true, value: { badInput: true } });

describe("FiltroFecha: el filtro se aplica con la fecha terminada, no con cada tecla", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("tipear una fecha entera la aplica una sola vez, después de la pausa", () => {
    const { onChange, input } = montar();
    for (const valor of TIPEO_01_09_2026) {
      fireEvent.change(input, { target: { value: valor } });
      act(() => vi.advanceTimersByTime(150));
    }
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(500));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("2026-09-01");
  });

  it("un año a medio tipear no se aplica, y al salir el campo vuelve a la fecha aplicada", () => {
    const { onChange, input } = montar();
    fireEvent.change(input, { target: { value: "0202-09-20" } });
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("2026-09-20");
  });

  it("vacío a medio tipear no es 'sin fecha': al salir no quita el filtro", () => {
    const { onChange, input } = montar();
    aMedioTipear(input);
    fireEvent.change(input, { target: { value: "" } });
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("2026-09-20");
  });

  it("borrar la fecha quita el filtro", () => {
    const { onChange, input } = montar();
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("Enter o salir del campo aplican en el momento, sin esperar la pausa", () => {
    const { onChange, input } = montar();
    fireEvent.change(input, { target: { value: "2026-09-05" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("2026-09-05");
    act(() => vi.advanceTimersByTime(1000));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("si la fecha no cambió no avisa, y sigue a la aplicada cuando cambia desde afuera", () => {
    const { onChange, input, rerender } = montar();
    fireEvent.change(input, { target: { value: "2026-09-20" } });
    act(() => vi.advanceTimersByTime(600));
    expect(onChange).not.toHaveBeenCalled();
    rerender(
      <label>
        Desde
        <FiltroFecha value="2026-08-01" onChange={onChange} />
      </label>,
    );
    expect(input.value).toBe("2026-08-01");
  });
});
