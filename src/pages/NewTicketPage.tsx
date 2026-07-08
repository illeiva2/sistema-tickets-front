import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from "@/components/ui";
import { Ticket, Send, ArrowLeft, Lightbulb, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTickets } from "../hooks";
import api from "../lib/api";
import type { ResourceSuggestion } from "../types/resources";
import type { KbSugerencia } from "../types/kb";
import {
  RESOURCE_CATEGORY_GLYPH,
  RESOURCE_CATEGORY_LABEL,
} from "../constants/resourceCategories";

const NewTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const { createTicket } = useTickets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    category: "" as "" | "SOFTWARE" | "HARDWARE" | "RED" | "ERP" | "OTRO",
  });

  // Sugerencias contextuales no bloqueantes basadas en el título.
  // Dos fuentes en paralelo: la KB interna (resources) y la documentación
  // oficial de Finnegans (bc.finneg.com). Si una falla, la otra se muestra
  // igual.
  const [suggestions, setSuggestions] = useState<ResourceSuggestion[]>([]);
  const [kbSuggestions, setKbSuggestions] = useState<KbSugerencia[]>([]);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  useEffect(() => {
    if (suggestionsDismissed) return;
    const q = formData.title.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setKbSuggestions([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const [internas, oficiales] = await Promise.allSettled([
        api.get(`/api/resources/suggest?q=${encodeURIComponent(q)}&limit=5`),
        api.get(`/api/kb/buscar?q=${encodeURIComponent(q)}&limit=3`),
      ]);
      if (cancelled) return;
      setSuggestions(
        internas.status === "fulfilled"
          ? (internas.value.data?.data ?? [])
          : [],
      );
      setKbSuggestions(
        oficiales.status === "fulfilled"
          ? (oficiales.value.data?.data?.sugerencias ?? [])
          : [],
      );
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [formData.title, suggestionsDismissed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        ...(formData.category ? { category: formData.category } : {}),
      };
      await createTicket(payload);
      navigate("/tickets");
    } catch (error) {
      // El error ya se maneja en el hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/tickets")}
        >
          <ArrowLeft size={16} className="mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Ticket</h1>
          <p className="text-sm text-muted-foreground">
            Crear un nuevo ticket de soporte
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="px-3 pt-2 pb-3">
          <CardTitle className="flex items-center space-x-2 pl-2">
            <Ticket size={18} />
            <span className="text-base">Crear Ticket</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Resumen del problema o solicitud"
                required
                className="w-full dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {!suggestionsDismissed &&
              (suggestions.length > 0 || kbSuggestions.length > 0) && (
              <div className="rounded-md border border-primary/30 bg-primary/5 dark:bg-primary/10 px-3 py-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground">
                    <Lightbulb size={14} className="text-primary" />
                    ¿Quizás esto te ayuda?
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuggestionsDismissed(true)}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Ocultar
                  </button>
                </div>
                {suggestions.length > 0 && (
                  <ul className="space-y-1">
                    {suggestions.map((s) => (
                      <li key={s.id}>
                        <Link
                          to={`/resources/${s.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-start gap-2 text-[13px] hover:bg-primary/10 rounded px-2 py-1.5 transition-colors"
                        >
                          <span aria-hidden className="shrink-0 mt-0.5">
                            {RESOURCE_CATEGORY_GLYPH[s.category]}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium text-foreground group-hover:text-primary truncate">
                              {s.title}
                            </span>
                            {s.excerpt && (
                              <span className="block text-[11.5px] text-muted-foreground line-clamp-1">
                                {s.excerpt}
                              </span>
                            )}
                            <span className="block text-[10.5px] text-muted-foreground mt-0.5">
                              {RESOURCE_CATEGORY_LABEL[s.category]}
                            </span>
                          </span>
                          <ExternalLink
                            size={12}
                            className="shrink-0 mt-1 text-muted-foreground group-hover:text-primary"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {kbSuggestions.length > 0 && (
                  <div
                    className={
                      suggestions.length > 0
                        ? "pt-1.5 border-t border-primary/10"
                        : ""
                    }
                  >
                    <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground px-2 mb-0.5">
                      De la ayuda oficial de Finnegans
                    </div>
                    <ul className="space-y-1">
                      {kbSuggestions.map((s) => (
                        <li key={s.topicId}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-start gap-2 text-[13px] hover:bg-primary/10 rounded px-2 py-1.5 transition-colors"
                          >
                            <span aria-hidden className="shrink-0 mt-0.5">
                              📖
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block font-medium text-foreground group-hover:text-primary truncate">
                                {s.titulo}
                              </span>
                              {s.extracto && (
                                <span className="block text-[11.5px] text-muted-foreground line-clamp-1">
                                  {s.extracto}
                                </span>
                              )}
                              {s.categoria && (
                                <span className="block text-[10.5px] text-muted-foreground mt-0.5">
                                  {s.categoria} · bc.finneg.com
                                </span>
                              )}
                            </span>
                            <ExternalLink
                              size={12}
                              className="shrink-0 mt-1 text-muted-foreground group-hover:text-primary"
                            />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-[10.5px] text-muted-foreground pt-1 border-t border-primary/10">
                  Si igual querés crear el ticket, completá la descripción y enviá.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Descripción *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Describe detalladamente el problema o solicitud..."
                required
                rows={4}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Prioridad</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange("priority", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Categoría</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="">Sin categoría</option>
                  <option value="SOFTWARE">◇ Software</option>
                  <option value="HARDWARE">▤ Hardware</option>
                  <option value="RED">≋ Red</option>
                  <option value="ERP">◈ ERP</option>
                  <option value="OTRO">◯ Otro</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Ayuda a clasificar el ticket. Opcional.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/tickets")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  isSubmitting || !formData.title || !formData.description
                }
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Crear Ticket
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewTicketPage;
