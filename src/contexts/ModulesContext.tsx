import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../hooks";

export type ModuleLevel = "VIEWER" | "QC" | "MANAGEMENT";

export interface UserModuleAccess {
  key: string;
  name: string;
  description: string;
  /** true = el modulo no vive en esta app; el item de menu manda afuera. */
  external: boolean;
  level: ModuleLevel;
  /** true = el acceso viene de ser ADMIN, no de una concesion explicita. */
  implicit: boolean;
}

interface ModulesContextType {
  modules: UserModuleAccess[];
  isLoading: boolean;
  /** ¿Tiene habilitado este modulo? */
  has: (key: string) => boolean;
  /** Nivel con el que entra, o null si no tiene acceso. */
  levelOf: (key: string) => ModuleLevel | null;
  refresh: () => Promise<void>;
}

const ModulesContext = createContext<ModulesContextType | undefined>(undefined);

/**
 * Modulos habilitados para el usuario logueado.
 *
 * Se consulta al backend y no se lee del JWT a proposito: asi revocar un
 * permiso surte efecto en el proximo refresh en vez de esperar a que expire
 * el access token.
 */
export const ModulesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [modules, setModules] = useState<UserModuleAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setModules([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get("/api/modules/me");
      setModules(res.data?.data ?? []);
    } catch {
      // Si falla, se asume sin modulos: es el lado seguro. El resto de la app
      // no depende de esto, asi que no vale la pena molestar con un toast.
      setModules([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value: ModulesContextType = {
    modules,
    isLoading,
    has: (key) => modules.some((m) => m.key === key),
    levelOf: (key) => modules.find((m) => m.key === key)?.level ?? null,
    refresh: load,
  };

  return (
    <ModulesContext.Provider value={value}>{children}</ModulesContext.Provider>
  );
};

export const useModules = (): ModulesContextType => {
  const ctx = useContext(ModulesContext);
  if (!ctx) {
    throw new Error("useModules debe usarse dentro de <ModulesProvider>");
  }
  return ctx;
};
