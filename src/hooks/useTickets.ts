// useTickets es ahora un re-export del hook que vive en TicketsContext.
// La firma se mantiene idéntica para no tocar los callsites; el state
// pasa a ser compartido entre todos los consumidores en lugar de
// mantenerse local en cada instancia.
export { useTickets } from "../contexts/TicketsContext";
