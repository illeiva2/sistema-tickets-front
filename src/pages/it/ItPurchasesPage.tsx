import { ShoppingCart, Truck } from "lucide-react";
import ItModulePlaceholder from "@/components/it/ItModulePlaceholder";

// Compras de equipamiento/insumos y padrón de proveedores (una sola página
// con dos vistas, como define el diseño).
const ItPurchasesPage = () => (
  <ItModulePlaceholder
    icon={<ShoppingCart size={20} />}
    title="Compras y proveedores"
    description="Órdenes de compra de equipamiento e insumos con autorización, y el padrón de proveedores de hardware y servicio técnico."
    features={[
      "Pipeline de órdenes: solicitada → autorizada → pedida → recibida",
      "Autorización de compras a cargo de un administrador",
      "Items que generan equipos en el inventario al marcarse la recepción",
      "Justificación obligatoria y cotización de referencia si la compra es en dólares",
      "Adjuntos de facturas, presupuestos y remitos",
      "ABM de proveedores con historial de compras y mantenimientos",
    ]}
    sections={[
      {
        icon: <ShoppingCart className="h-12 w-12" />,
        title: "Órdenes de compra",
        description:
          "Las compras del área, desde la solicitud hasta la recepción.",
        emptyTitle: "Todavía no hay órdenes cargadas",
        emptyDescription:
          "Cuando el módulo esté activo vas a poder cargar la primera orden y seguirla por todo el circuito de autorización.",
      },
      {
        icon: <Truck className="h-12 w-12" />,
        title: "Proveedores",
        description:
          "Proveedores de hardware, insumos y servicio técnico.",
        emptyTitle: "Sin proveedores cargados",
        emptyDescription:
          "Vas a poder dar de alta proveedores acá o crearlos al vuelo mientras cargás una compra.",
      },
    ]}
  />
);

export default ItPurchasesPage;
