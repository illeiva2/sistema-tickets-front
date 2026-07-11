import { Radar } from "lucide-react";
import ItModulePlaceholder from "@/components/it/ItModulePlaceholder";

// Equipos con agente de monitoreo: estado en vivo, métricas y acceso remoto.
const ItLiveDevicesPage = () => (
  <ItModulePlaceholder
    icon={<Radar size={20} />}
    title="Equipos en vivo"
    description="Estado en tiempo real de los equipos que tienen el agente de monitoreo instalado: quién está logueado, cómo vienen los recursos y si hay acceso remoto disponible."
    features={[
      "Grilla de equipos online/offline con su último heartbeat",
      "Usuario logueado, IP, CPU, RAM y batería de cada equipo",
      "Inventario de hardware y software reportado por el agente",
      "Gráficos de métricas de las últimas 24 horas o 7 días",
      "Pedido de inventario a demanda si el equipo está en línea",
      "Acceso remoto por SSH o VNC, auditado (en fases siguientes)",
    ]}
    sections={[
      {
        icon: <Radar className="h-12 w-12" />,
        title: "Equipos con agente",
        description:
          "Cada equipo enrolado reporta su estado por WebSocket saliente.",
        emptyTitle: "Ningún equipo reporta todavía",
        emptyDescription:
          "Cuando el agente de monitoreo esté desplegado, los equipos van a aparecer acá con su estado en vivo y sus métricas.",
      },
    ]}
  />
);

export default ItLiveDevicesPage;
