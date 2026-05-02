import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from "@/components/ui";
import { Ticket, Send, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "../hooks";

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
