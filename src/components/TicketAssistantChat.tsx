import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { Bot, Send, ExternalLink, Sparkles } from "lucide-react";
import api from "../lib/api";
import MarkdownView from "./MarkdownView";

// Chat del asistente de soporte en la creación de tickets. Busca en la
// documentación oficial de Finnegans (bc.finneg.com) y en la KB interna,
// y arma una respuesta con IA antes de que el usuario cree el ticket.
//
// No bloquea nada: si el asistente no resuelve, el usuario sigue con el
// formulario normalmente. Si la IA no está configurada en el server
// (/api/assistant/status), el componente no se renderiza.

interface Fuente {
  titulo: string;
  url: string;
  origen: "oficial" | "interno";
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  fuentes?: Fuente[];
}

const MAX_TURNS = 12;

const TicketAssistantChat: React.FC<{
  title: string;
  description: string;
}> = ({ title, description }) => {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [opened, setOpened] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [transientError, setTransientError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get("/api/assistant/status");
        if (!cancelled) setConfigured(!!resp.data?.data?.configured);
      } catch {
        if (!cancelled) setConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-scroll al final cuando llegan mensajes.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  if (configured === false || configured === null) return null;

  const canStart = title.trim().length >= 5;
  const turnsLeft = messages.length < MAX_TURNS - 1;

  const send = async (history: ChatMessage[]) => {
    setSending(true);
    try {
      const resp = await api.post("/api/assistant/chat", {
        // El server espera la conversación limpia (role + content).
        messages: history.map(({ role, content }) => ({ role, content })),
      });
      const { reply, fuentes } = resp.data?.data ?? {};
      setMessages([
        ...history,
        { role: "assistant", content: reply || "…", fuentes: fuentes ?? [] },
      ]);
    } catch (e: any) {
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.error?.message;
      if (status === 503) {
        setFatalError(serverMsg || "El asistente no está disponible.");
      } else {
        // Error recuperable: sacamos el último mensaje del user y lo
        // devolvemos al input para que pueda reintentar sin retipear.
        setMessages(history.slice(0, -1));
        setInput(history[history.length - 1]?.content ?? "");
        setTransientError(
          serverMsg || "No se pudo consultar el asistente. Probá de nuevo.",
        );
      }
    } finally {
      setSending(false);
    }
  };

  const handleStart = () => {
    setOpened(true);
    setTransientError(null);
    const primera = [title.trim(), description.trim()]
      .filter(Boolean)
      .join(". ")
      .slice(0, 2000);
    const history: ChatMessage[] = [{ role: "user", content: primera }];
    setMessages(history);
    send(history);
  };

  const handleFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !turnsLeft) return;
    setInput("");
    setTransientError(null);
    const history: ChatMessage[] = [
      ...messages,
      { role: "user", content: text.slice(0, 2000) },
    ];
    setMessages(history);
    send(history);
  };

  return (
    <div className="rounded-md border border-border bg-card/40 overflow-hidden">
      {/* Header / CTA */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Bot size={16} className="text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium">
              Probá resolverlo con el asistente
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Busca en la ayuda oficial de Finnegans y en los recursos
              internos antes de crear el ticket.
            </div>
          </div>
        </div>
        {!opened && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStart}
            disabled={!canStart}
            title={
              canStart
                ? "Consultar al asistente"
                : "Escribí primero el título del problema"
            }
            className="shrink-0"
          >
            <Sparkles size={13} className="mr-1.5" />
            Consultar
          </Button>
        )}
      </div>

      {opened && (
        <div className="border-t border-border">
          {/* Mensajes */}
          <div
            ref={scrollRef}
            className="max-h-72 overflow-y-auto px-3 py-2.5 space-y-2.5"
          >
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-[12.5px] whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="max-w-[92%] rounded-lg bg-muted/50 border border-border px-3 py-2">
                    <MarkdownView
                      source={m.content}
                      className="text-[12.5px]"
                    />
                  </div>
                  {m.fuentes && m.fuentes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-1">
                      {m.fuentes.map((f, j) => (
                        <a
                          key={j}
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded-md border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors max-w-[240px]"
                          title={f.titulo}
                        >
                          {f.origen === "oficial" ? "📖" : "📚"}
                          <span className="truncate">{f.titulo}</span>
                          <ExternalLink size={9} className="shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}
            {sending && (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Bot size={13} className="animate-pulse" />
                Buscando en la documentación…
              </div>
            )}
            {fatalError && (
              <p className="text-[12px] text-muted-foreground border border-border rounded-md px-3 py-2 bg-muted/30">
                {fatalError} Podés crear el ticket normalmente.
              </p>
            )}
            {transientError && !sending && (
              <p className="text-[11.5px] text-amber-700 dark:text-amber-300">
                {transientError}
              </p>
            )}
          </div>

          {/* Input de repregunta */}
          {!fatalError && (
            <form
              onSubmit={handleFollowUp}
              className="flex items-center gap-2 border-t border-border px-3 py-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  turnsLeft
                    ? "Repreguntá o agregá detalle…"
                    : "Alcanzaste el límite de la conversación — creá el ticket."
                }
                disabled={sending || !turnsLeft}
                className="flex-1 px-3 py-1.5 text-[12.5px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={sending || !input.trim() || !turnsLeft}
                className="shrink-0 h-8 px-2.5"
              >
                <Send size={13} />
              </Button>
            </form>
          )}

          <p className="px-3 pb-2 text-[10.5px] text-muted-foreground">
            El asistente puede equivocarse. Si no lo resuelve, creá el ticket
            igual — no perdés lo que escribiste.
          </p>
        </div>
      )}
    </div>
  );
};

export default TicketAssistantChat;
