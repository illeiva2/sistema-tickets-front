export type SeededRole = "ADMIN" | "AGENT" | "USER";

export const seededUsers: Record<
  SeededRole,
  { email: string; password: string; name: string }
> = {
  ADMIN: {
    email: "admin@empresa.com",
    password: "password123",
    name: "Administrador del Sistema",
  },
  AGENT: {
    email: "agente1@empresa.com",
    password: "password123",
    name: "María González",
  },
  USER: {
    email: "usuario1@empresa.com",
    password: "password123",
    name: "Ana Martínez",
  },
};

export const seededTicketTitles = {
  claimable: "Conexión a internet muy lenta en todo el edificio",
  adminEditable: "Sistema de facturación no genera facturas correctamente",
  dashboardClosable: "No puedo enviar correos electrónicos desde Outlook",
};