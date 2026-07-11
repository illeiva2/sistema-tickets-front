import { CalendarClock, History, Wrench } from "lucide-react";
import ItModulePlaceholder from "@/components/it/ItModulePlaceholder";

// Mantenimientos preventivos, correctivos y upgrades sobre el inventario.
const ItMaintenancePage = () => (
  <ItModulePlaceholder
    icon={<Wrench size={20} />}
    title="Mantenimientos"
    description="Preventivos, correctivos y upgrades sobre los equipos del inventario, con costos y responsables."
    features={[
      "Agenda de preventivos con fecha programada",
      "Historial completo de intervenciones por equipo",
      "Registro del técnico interno o del proveedor externo que hizo el trabajo",
      "Costos con moneda y detalle de repuestos usados",
      "Vínculo con el ticket que originó cada reparación",
      "El equipo pasa a “En reparación” y vuelve a su estado al completarse",
    ]}
    sections={[
      {
        icon: <CalendarClock className="h-12 w-12" />,
        title: "Próximos",
        description: "Preventivos programados, ordenados por fecha.",
        emptyTitle: "No hay mantenimientos programados",
        emptyDescription:
          "Cuando el módulo esté activo vas a poder agendar preventivos y verlos acá antes de que venzan.",
      },
      {
        icon: <History className="h-12 w-12" />,
        title: "Historial",
        description: "Todo lo ya ejecutado, con costo y responsable.",
        emptyTitle: "Sin mantenimientos registrados",
        emptyDescription:
          "El historial se va a armar solo a medida que registres intervenciones sobre los equipos.",
      },
    ]}
  />
);

export default ItMaintenancePage;
