import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/hooks";

/**
 * Preferencias de interfaz del usuario, guardadas en su perfil (backend), no en
 * el navegador: la vista que armó en la PC de la oficina tiene que aparecer
 * igual en el celular. `savedViews` guarda la configuración de cada vista
 * personalizable (qué columnas, en qué orden, cómo ordenar) por clave de vista.
 */

export interface SavedViewConfig {
  /** Columnas visibles, en orden. */
  columns: string[];
  sort?: { id: string; desc: boolean }[];
  widths?: Record<string, number>;
  density?: "compact" | "normal";
}

export interface UiPreferencesDto {
  theme: string;
  darkMode: boolean | null;
  savedViews: Record<string, SavedViewConfig | undefined>;
}

const BASE = "/api/me/ui-preferences";

export const uiPreferencesApi = {
  get: async (): Promise<UiPreferencesDto> =>
    (await api.get<{ success: boolean; data: UiPreferencesDto }>(BASE)).data.data,
  saveView: async (viewKey: string, config: SavedViewConfig) =>
    (
      await api.put<{ success: boolean; data: { viewKey: string; config: SavedViewConfig } }>(
        `${BASE}/views/${encodeURIComponent(viewKey)}`,
        { config },
      )
    ).data.data,
  deleteView: async (viewKey: string) =>
    (
      await api.delete<{ success: boolean; data: { viewKey: string; deleted: boolean } }>(
        `${BASE}/views/${encodeURIComponent(viewKey)}`,
      )
    ).data.data,
};

/** Clave por usuario: al cambiar de sesión en la misma pestaña no se hereda la vista de otro. */
export const uiPreferencesKey = (userId: string | undefined) => ["ui-preferences", userId ?? "anon"] as const;

/** Los cambios de columnas vienen en ráfaga (tildar cinco casillas); se guarda una vez que paran. */
const DEBOUNCE_MS = 700;

export type EstadoGuardado = "guardando" | "guardado" | "error" | null;

const conVista = (
  prev: UiPreferencesDto | undefined,
  viewKey: string,
  config: SavedViewConfig | undefined,
): UiPreferencesDto => {
  const savedViews = Object.fromEntries(
    Object.entries(prev?.savedViews ?? {}).filter(([k]) => k !== viewKey),
  ) as Record<string, SavedViewConfig | undefined>;
  if (config) savedViews[viewKey] = config;
  return { theme: prev?.theme ?? "quiet-pro", darkMode: prev?.darkMode ?? null, savedViews };
};

/**
 * Configuración de una vista personalizable: la guardada por el usuario o, si
 * nunca tocó nada, la sugerida. `guardar` actualiza la pantalla al instante y
 * persiste con un pequeño retardo; `restablecer` vuelve a la sugerida.
 */
export function useSavedView(viewKey: string, sugerida: SavedViewConfig) {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const clave = React.useMemo(() => uiPreferencesKey(userId), [userId]);

  const q = useQuery({
    queryKey: clave,
    queryFn: uiPreferencesApi.get,
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const [estado, setEstado] = React.useState<EstadoGuardado>(null);
  const pendiente = React.useRef<{ timer: number; config: SavedViewConfig } | null>(null);

  const guardada = q.data?.savedViews?.[viewKey];
  const config = guardada ?? sugerida;

  const enviar = React.useCallback(
    async (cfg: SavedViewConfig) => {
      setEstado("guardando");
      try {
        await uiPreferencesApi.saveView(viewKey, cfg);
        setEstado("guardado");
      } catch {
        setEstado("error");
        toast.error("No se pudo guardar la vista en tu perfil");
        void qc.invalidateQueries({ queryKey: clave });
      }
    },
    [viewKey, qc, clave],
  );

  const guardar = React.useCallback(
    (cfg: SavedViewConfig) => {
      qc.setQueryData<UiPreferencesDto>(clave, (prev) => conVista(prev, viewKey, cfg));
      if (pendiente.current) window.clearTimeout(pendiente.current.timer);
      pendiente.current = {
        config: cfg,
        timer: window.setTimeout(() => {
          pendiente.current = null;
          void enviar(cfg);
        }, DEBOUNCE_MS),
      };
    },
    [qc, clave, viewKey, enviar],
  );

  const restablecer = React.useCallback(async () => {
    if (pendiente.current) {
      window.clearTimeout(pendiente.current.timer);
      pendiente.current = null;
    }
    qc.setQueryData<UiPreferencesDto>(clave, (prev) => conVista(prev, viewKey, undefined));
    try {
      await uiPreferencesApi.deleteView(viewKey);
      setEstado(null);
    } catch {
      toast.error("No se pudo restablecer la vista");
      void qc.invalidateQueries({ queryKey: clave });
    }
  }, [qc, clave, viewKey]);

  // Si se navega con un guardado pendiente, se manda ya: si no, el último
  // cambio se ve en pantalla pero no llega al perfil.
  React.useEffect(
    () => () => {
      const p = pendiente.current;
      if (!p) return;
      window.clearTimeout(p.timer);
      pendiente.current = null;
      void uiPreferencesApi.saveView(viewKey, p.config).catch(() => undefined);
    },
    [viewKey],
  );

  return {
    config,
    /** El usuario tiene una configuración propia guardada (no está en la sugerida). */
    personalizada: !!guardada,
    guardar,
    restablecer,
    estado,
    cargando: !!userId && q.isPending,
  };
}
