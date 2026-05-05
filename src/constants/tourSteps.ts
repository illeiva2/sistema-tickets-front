import type { TourStep } from "../components/OnboardingTour";

// Tour de bienvenida para nuevos usuarios. Si en el futuro se cambia
// significativamente, bumpear la version (TOUR_STORAGE_KEY) para que
// vuelva a aparecer a todos.
export const TOUR_STORAGE_KEY = "onboarding:tour:v1";

// Selectores: usamos a[href="..."] para no tener que tocar los layouts.
// El componente busca el primer match visible en pantalla.
export const ONBOARDING_STEPS: TourStep[] = [
  {
    title: "Bienvenido al sistema de soporte",
    description:
      "Acá vas a poder pedir ayuda al sector de tecnología, ver el estado de tus pedidos y consultar guías. Te muestro lo principal en menos de un minuto.",
  },
  {
    target: 'a[href="/tickets"]',
    title: "Tus tickets",
    description:
      "En esta sección ves todos los pedidos de soporte que abriste o que tenés asignados. Cada ticket muestra su estado (abierto, en progreso, resuelto) y la última actualización.",
    placement: "auto",
  },
  {
    target: 'a[href="/tickets/new"]',
    title: "Crear un ticket nuevo",
    description:
      "Si tenés un problema o una solicitud, abrí un ticket desde acá. Mientras escribís el título, te vamos a sugerir guías que podrían resolverlo más rápido.",
    placement: "auto",
  },
  {
    target: 'a[href="/resources"]',
    title: "Recursos",
    description:
      "Acá encontrás el manual de uso, políticas internas, FAQs y avisos importantes. Antes de abrir un ticket, conviene revisar si la respuesta ya está acá.",
    placement: "auto",
  },
  {
    title: "Listo, ya podés empezar",
    description:
      "Si más adelante querés volver a ver este tour, está disponible en el menú de tu usuario (arriba a la derecha) en la opción 'Ver tour de nuevo'.",
  },
];
