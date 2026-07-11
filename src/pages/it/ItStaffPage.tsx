import { Smartphone, Users } from "lucide-react";
import ItModulePlaceholder from "@/components/it/ItModulePlaceholder";

// Padrón de personal (con o sin cuenta de sistema) y líneas de celular
// corporativas, en una sola página con dos vistas.
const ItStaffPage = () => (
  <ItModulePlaceholder
    icon={<Smartphone size={20} />}
    title="Personal y líneas"
    description="Padrón de las personas que trabajan en la empresa (tengan o no cuenta en el sistema) y gestión de las líneas de celular corporativas."
    features={[
      "Personas con legajo, puesto, sector y estado laboral",
      "Vincular cada persona con su cuenta de usuario del sistema",
      "Solo datos laborales: sin DNI, domicilio ni información personal sensible",
      "Líneas corporativas con operadora, plan y costo mensual",
      "Historial de tenencia: quién tuvo cada línea y cuándo",
      "Asignar y liberar líneas y equipos con trazabilidad completa",
    ]}
    sections={[
      {
        icon: <Users className="h-12 w-12" />,
        title: "Personal",
        description:
          "El padrón laboral sobre el que se asignan equipos y líneas.",
        emptyTitle: "Todavía no hay personas cargadas",
        emptyDescription:
          "Cuando el módulo esté activo vas a poder cargar el padrón a mano o importarlo desde un listado de RRHH.",
      },
      {
        icon: <Smartphone className="h-12 w-12" />,
        title: "Líneas",
        description:
          "Las líneas corporativas, su titular actual y su costo.",
        emptyTitle: "Todavía no hay líneas cargadas",
        emptyDescription:
          "Vas a ver acá cada línea con su operadora, plan, costo mensual y a quién está asignada.",
      },
    ]}
  />
);

export default ItStaffPage;
