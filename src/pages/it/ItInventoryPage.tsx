import { HardDrive } from "lucide-react";
import ItModulePlaceholder from "@/components/it/ItModulePlaceholder";

// Inventario de equipamiento IT: ciclo de vida completo de cada equipo.
const ItInventoryPage = () => (
  <ItModulePlaceholder
    icon={<HardDrive size={20} />}
    title="Inventario"
    description="Ciclo de vida completo del equipamiento IT: se compra, ingresa, se asigna, se mantiene y se da de baja, con trazabilidad en cada paso."
    features={[
      "Tabla de equipos con búsqueda por código interno, serie, marca y modelo",
      "Filtros por tipo, estado, sector y persona asignada",
      "Ficha de cada equipo con historial de asignaciones, mantenimientos y tickets vinculados",
      "Aviso de garantías por vencer",
      "Asignar, devolver a depósito y dar de baja, siempre con registro de quién y cuándo",
      "Alta manual o automática desde una compra recibida",
    ]}
    sections={[
      {
        icon: <HardDrive className="h-12 w-12" />,
        title: "Equipos",
        description:
          "Todos los equipos del parque IT, con su estado y asignación vigente.",
        emptyTitle: "Todavía no hay equipos cargados",
        emptyDescription:
          "Cuando el módulo esté activo vas a poder dar de alta equipos a mano o generarlos automáticamente al recibir una compra.",
      },
    ]}
  />
);

export default ItInventoryPage;
