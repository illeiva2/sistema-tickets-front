# Playwright e2e base

Esta carpeta contiene la base de pruebas end-to-end del frontend.

## Flujos cubiertos

- Login y logout por rol.
- Creación de ticket como usuario final.
- Gestión de ticket como agente y como admin.
- Validación de métricas del dashboard al crear o cerrar tickets.

## Ejecución

1. Levantar la app completa, idealmente con Docker Compose.
2. Ejecutar `pnpm test:e2e` desde `sistema-tickets-front`.

## Variables opcionales

- `PLAYWRIGHT_BASE_URL`: URL del frontend, por defecto `http://127.0.0.1:5173`.