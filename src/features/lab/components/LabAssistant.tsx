import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Cpu, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui";
import MarkdownView from "@/components/MarkdownView";
import { labApi, labError, labKeys } from "../api";
import type { AssistantHistoryTurn, AssistantTraceDto } from "../types";

/**
 * Asistente del laboratorio: preguntas en lenguaje natural sobre las muestras
 * y sus análisis, respondidas por un modelo que corre en el servidor del
 * molino (no en la nube). Es una prueba: por eso convive con las pestañas como
 * un botón flotante y no reemplaza ninguna pantalla.
 *
 * La respuesta no llega en el mismo pedido: se encola la pregunta y se
 * consulta su estado cada tanto, porque el modelo tarda varios segundos y el
 * relé del molino la busca por long-poll.
 */

interface Turno {
  role: "user" | "assistant";
  content: string;
  trace?: AssistantTraceDto[];
  error?: boolean;
}

const SUGERENCIAS = [
  "¿Qué muestras de hoy tienen alteraciones?",
  "Promedio de proteína de las muestras de acopio de esta semana",
  "¿Cuál fue el W más alto del mes y de qué muestra?",
  "¿Están reportando todos los equipos?",
];

/** Cada cuánto se consulta el estado de una pregunta en curso. */
const POLL_MS = 1500;
/** Turnos que se mandan como contexto de la conversación (los últimos). */
const CONTEXTO_TURNOS = 8;
const MAX_TURNOS = 24;

export const LabAssistant: React.FC = () => {
  const [abierto, setAbierto] = React.useState(false);
  const [turnos, setTurnos] = React.useState<Turno[]>([]);
  const [texto, setTexto] = React.useState("");
  const [pendienteId, setPendienteId] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [desde, setDesde] = React.useState<number | null>(null);
  const [segundos, setSegundos] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const estadoQ = useQuery({
    queryKey: labKeys.assistantStatus,
    queryFn: () => labApi.assistant.status(),
    refetchInterval: abierto ? 30_000 : 120_000,
    staleTime: 20_000,
  });
  const estado = estadoQ.data;
  const disponible = estado?.available ?? false;

  const pedidoQ = useQuery({
    queryKey: labKeys.assistantRequest(pendienteId ?? ""),
    queryFn: () => labApi.assistant.get(pendienteId!),
    enabled: !!pendienteId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "DONE" || s === "FAILED" ? false : POLL_MS;
    },
  });

  // Cuando la consulta pendiente termina, pasa a la conversación.
  React.useEffect(() => {
    const r = pedidoQ.data;
    if (!r || !pendienteId || r.id !== pendienteId) return;
    if (r.status === "DONE") {
      setTurnos((t) => [...t, { role: "assistant", content: r.answer ?? "", trace: r.toolTrace }]);
      setPendienteId(null);
    } else if (r.status === "FAILED") {
      setTurnos((t) => [...t, { role: "assistant", content: r.error ?? "No pude responder.", error: true }]);
      setPendienteId(null);
    }
  }, [pedidoQ.data, pendienteId]);

  // Si la consulta desaparece (404) o falla el polling, no dejar el chat colgado.
  React.useEffect(() => {
    if (!pedidoQ.error || !pendienteId) return;
    setTurnos((t) => [...t, { role: "assistant", content: labError(pedidoQ.error), error: true }]);
    setPendienteId(null);
  }, [pedidoQ.error, pendienteId]);

  // Contador de espera: con un modelo local, saber que "está pensando" evita el segundo clic.
  React.useEffect(() => {
    if (!pendienteId) {
      setDesde(null);
      setSegundos(0);
      return;
    }
    const inicio = Date.now();
    setDesde(inicio);
    const t = window.setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [pendienteId]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turnos, pendienteId, abierto]);

  const enviar = async (pregunta: string) => {
    const q = pregunta.trim();
    if (!q || enviando || pendienteId) return;
    const history: AssistantHistoryTurn[] = turnos
      .filter((t) => !t.error)
      .slice(-CONTEXTO_TURNOS)
      .map((t) => ({ role: t.role, content: t.content }));
    setTurnos((t) => [...t, { role: "user", content: q }]);
    setTexto("");
    setEnviando(true);
    try {
      const r = await labApi.assistant.ask(q, history);
      setPendienteId(r.id);
    } catch (e) {
      setTurnos((t) => [...t, { role: "assistant", content: labError(e), error: true }]);
    } finally {
      setEnviando(false);
    }
  };

  const nueva = () => {
    setTurnos([]);
    setPendienteId(null);
    setTexto("");
    inputRef.current?.focus();
  };

  const ocupado = enviando || !!pendienteId;
  const llenos = turnos.length >= MAX_TURNOS;

  return (
    <>
      {/* ─── Botón flotante ───────────────────────────────────────────── */}
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-2.5 text-[13px] font-medium hover:opacity-90 transition-opacity"
          title={disponible ? "Preguntale al asistente sobre los análisis" : "El asistente está desconectado"}
          aria-label="Abrir el asistente del laboratorio"
        >
          <Bot size={16} />
          Asistente
          <span
            className={`h-2 w-2 rounded-full ${disponible ? "bg-emerald-300" : "bg-amber-300"}`}
            aria-hidden
          />
        </button>
      )}

      {/* ─── Panel ────────────────────────────────────────────────────── */}
      {abierto && (
        <div
          role="dialog"
          aria-label="Asistente del laboratorio"
          className="fixed bottom-5 right-5 z-40 flex flex-col w-[420px] max-w-[calc(100vw-1.25rem)] h-[600px] max-h-[calc(100vh-2.5rem)] rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <Bot size={16} className="text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight">Asistente del laboratorio</div>
                <div className="text-[10.5px] text-muted-foreground truncate flex items-center gap-1">
                  {estadoQ.isPending ? (
                    "conectando…"
                  ) : disponible ? (
                    <>
                      <Cpu size={10} />
                      {estado?.model ?? "modelo local"}
                      {estado?.gpu === true ? " · GPU" : estado?.gpu === false ? " · CPU" : ""} · servidor del molino
                      {estado && estado.queued > 1 ? ` · ${estado.queued} en cola` : ""}
                    </>
                  ) : (
                    "desconectado: el servidor del molino no está enviando señal"
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {turnos.length > 0 && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground p-1"
                  onClick={nueva}
                  title="Nueva conversación"
                  aria-label="Nueva conversación"
                  disabled={ocupado}
                >
                  <RotateCcw size={14} />
                </button>
              )}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {turnos.length === 0 && (
              <div className="space-y-3">
                <p className="text-[12.5px] text-muted-foreground">
                  Preguntá en tus palabras sobre las muestras y sus análisis: el asistente consulta los datos
                  del laboratorio y te responde citando las accesiones.
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void enviar(s)}
                      disabled={!disponible || ocupado}
                      className="text-left text-[12.5px] rounded-md border border-border bg-background px-3 py-2 hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50 transition-colors"
                    >
                      <Sparkles size={11} className="inline mr-1.5 text-primary" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turnos.map((t, i) =>
              t.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-[12.5px] whitespace-pre-wrap break-words">
                    {t.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col gap-1">
                  <div
                    className={`max-w-[95%] rounded-lg border px-3 py-2 ${
                      t.error
                        ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-[12.5px] text-amber-900 dark:text-amber-200"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    {t.error ? t.content : <MarkdownView source={t.content} className="text-[12.5px] [&_p]:my-1.5 [&_table]:text-[12px]" />}
                  </div>
                  {t.trace && t.trace.length > 0 && (
                    <details className="pl-1 text-[10.5px] text-muted-foreground">
                      <summary className="cursor-pointer select-none">
                        Consultó {t.trace.length} {t.trace.length === 1 ? "herramienta" : "herramientas"}
                      </summary>
                      <ul className="mt-1 space-y-0.5 pl-3">
                        {t.trace.map((x, j) => (
                          <li key={j} className={x.ok ? "" : "text-amber-700 dark:text-amber-300"}>
                            {x.summary}
                            <span className="opacity-60"> · {(x.ms / 1000).toFixed(1)} s</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ),
            )}

            {pendienteId && (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Bot size={13} className="animate-pulse" />
                {pedidoQ.data?.status === "QUEUED" ? "Esperando al servidor del molino…" : "Consultando los análisis…"}
                {desde !== null && segundos >= 3 && <span className="tabular-nums opacity-70">{segundos} s</span>}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void enviar(texto);
            }}
            className="flex items-center gap-2 border-t border-border px-3 py-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={
                !disponible
                  ? "El asistente está desconectado"
                  : llenos
                    ? "Conversación larga: empezá una nueva"
                    : "Preguntá sobre las muestras y sus análisis…"
              }
              disabled={!disponible || ocupado || llenos}
              maxLength={1000}
              className="flex-1 px-3 py-1.5 text-[12.5px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
            <Button type="submit" size="sm" variant="outline" disabled={!disponible || ocupado || llenos || !texto.trim()} className="shrink-0 h-8 px-2.5" aria-label="Enviar">
              <Send size={13} />
            </Button>
          </form>
          <p className="px-3 pb-2 text-[10.5px] text-muted-foreground">
            Prueba con un modelo local: puede equivocarse. Los datos citados están en la ficha de cada muestra;
            verificá ahí antes de decidir.
          </p>
        </div>
      )}
    </>
  );
};

export default LabAssistant;
