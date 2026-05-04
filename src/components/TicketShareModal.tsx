import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Share2, X } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import Avatar from "./Avatar";

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface TicketShareModalProps {
  open: boolean;
  ticketId: string;
  agents: Agent[];
  // Lista de userIds con los que NO se debe compartir: assignee actual,
  // ya compartidos, current user.
  excludeUserIds?: string[];
  onClose: () => void;
  onShared: () => void; // callback para refrescar el detalle
}

const TicketShareModal: React.FC<TicketShareModalProps> = ({
  open,
  ticketId,
  agents,
  excludeUserIds = [],
  onClose,
  onShared,
}) => {
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedId("");
      setMessage("");
    }
  }, [open]);

  if (!open) return null;

  const eligible = agents.filter((a) => !excludeUserIds.includes(a.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      toast.error("Elegí un agente");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/tickets/${ticketId}/share`, {
        sharedWithId: selectedId,
        message: message.trim() || undefined,
      });
      toast.success("Ticket compartido");
      onShared();
      onClose();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error?.message || "No se pudo compartir",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-primary" />
            <h2 className="text-lg font-semibold">Compartir ticket</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-[12.5px] text-muted-foreground">
          El agente recibe acceso de lectura y puede comentar. No reemplaza la
          asignación.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground">
              Compartir con
            </label>
            {eligible.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground py-2">
                No hay agentes elegibles para compartir.
              </p>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-border rounded-md bg-background"
                required
              >
                <option value="">Elegí un agente…</option>
                {eligible.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground">
              Mensaje (opcional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ej: ¿viste algo parecido antes?"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background resize-none"
            />
          </div>

          {selectedId && (
            <div className="rounded-md bg-muted/40 px-3 py-2 flex items-center gap-2 text-[12.5px]">
              <Avatar
                name={agents.find((a) => a.id === selectedId)?.name}
                email={agents.find((a) => a.id === selectedId)?.email}
                size={20}
              />
              <span className="truncate">
                Le va a llegar una notificación a{" "}
                <span className="font-medium">
                  {agents.find((a) => a.id === selectedId)?.name}
                </span>
                .
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !selectedId || eligible.length === 0}
            >
              <Share2 size={14} className="mr-1.5" />
              {submitting ? "Compartiendo..." : "Compartir"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketShareModal;
