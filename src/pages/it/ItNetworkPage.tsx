import { Network, Router } from "lucide-react";
import ItModulePlaceholder from "@/components/it/ItModulePlaceholder";

// Dispositivos de red por sitio físico y editor visual de topología.
const ItNetworkPage = () => (
  <ItModulePlaceholder
    icon={<Network size={20} />}
    title="Red y topología"
    description="Inventario de los dispositivos de red por sitio físico y editor visual de la topología, para documentar cómo está conectado todo."
    features={[
      "Dispositivos por sitio: routers, switches, access points, cámaras, UPS y más",
      "IP de administración, VLANs, MAC y ubicación física de cada equipo",
      "Enlaces entre dispositivos con puertos, tipo de medio y velocidad",
      "Editor visual de topología con layouts guardados por sitio",
      "Referencia al gestor de contraseñas del equipo (nunca credenciales en esta base)",
      "Vínculo opcional con la ficha patrimonial del inventario",
    ]}
    sections={[
      {
        icon: <Router className="h-12 w-12" />,
        title: "Dispositivos",
        description:
          "El detalle operativo de cada equipo de red, agrupado por sitio.",
        emptyTitle: "Sin dispositivos cargados",
        emptyDescription:
          "Cuando el módulo esté activo vas a poder cargar los equipos de cada sitio con su IP, VLANs y ubicación.",
      },
      {
        icon: <Network className="h-12 w-12" />,
        title: "Topología",
        description:
          "El mapa visual de la red, editable y con guardado explícito.",
        emptyTitle: "Sin vistas de topología",
        emptyDescription:
          "Cuando cargues dispositivos y enlaces vas a poder armar acá el mapa de la red y guardar una vista por sitio.",
      },
    ]}
  />
);

export default ItNetworkPage;
