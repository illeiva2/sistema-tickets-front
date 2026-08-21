import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Save, ShieldCheck, Search } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { ModuleLevel } from "../contexts/ModulesContext";

interface ModuleDefinition {
  key: string;
  name: string;
  description: string;
  external: boolean;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "USER" | "AGENT" | "ADMIN";
  isActive?: boolean;
}

interface Grant {
  id: string;
  userId: string;
  moduleKey: string;
  level: ModuleLevel;
}

const LEVELS: ModuleLevel[] = ["VIEWER", "QC", "MANAGEMENT"];
const LEVEL_LABEL: Record<ModuleLevel, string> = {
  VIEWER: "Consulta",
  QC: "Calidad",
  MANAGEMENT: "Gerencia",
};

/**
 * Administración de acceso por módulo.
 *
 * Página aparte y no una pestaña de UsersPage a propósito: ese archivo es
 * grande y muy tocado, y este permiso es un eje distinto al del rol.
 */
const AdminModulesPage: React.FC = () => {
  const [catalog, setCatalog] = useState<ModuleDefinition[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Se guarda el fallo de cada endpoint por separado: con Promise.all un solo
  // error dejaba la pantalla entera vacia sin decir por que.
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  // Estado editable: userId -> (moduleKey -> level | undefined si no tiene)
  const [draft, setDraft] = useState<Record<string, Record<string, ModuleLevel | undefined>>>({});

  useEffect(() => {
    const load = async () => {
      // allSettled y no all: que falle /modules/grants no tiene por que impedir
      // ver los usuarios ni las columnas de modulos.
      const [cat, usr, grt] = await Promise.allSettled([
        api.get("/api/modules/catalog"),
        api.get("/api/users"),
        api.get("/api/modules/grants"),
      ]);

      const errs: string[] = [];
      const describe = (r: PromiseRejectedResult) => {
        const status = r.reason?.response?.status;
        const msg =
          r.reason?.response?.data?.error?.message ?? r.reason?.message ?? "error";
        return status ? `HTTP ${status} — ${msg}` : msg;
      };

      let catalogData: ModuleDefinition[] = [];
      if (cat.status === "fulfilled") {
        catalogData = cat.value.data?.data ?? [];
      } else {
        errs.push(`GET /modules/catalog: ${describe(cat)}`);
      }

      let usersData: UserRow[] = [];
      if (usr.status === "fulfilled") {
        const raw = usr.value.data?.data;
        usersData = Array.isArray(raw) ? raw : (raw?.users ?? raw?.items ?? []);
      } else {
        errs.push(`GET /users: ${describe(usr)}`);
      }

      let grantsData: Grant[] = [];
      if (grt.status === "fulfilled") {
        grantsData = grt.value.data?.data ?? [];
      } else {
        errs.push(`GET /modules/grants: ${describe(grt)}`);
      }

      setCatalog(catalogData);
      setUsers(usersData.filter((u) => u.isActive !== false));
      setGrants(grantsData);

      const initial: Record<string, Record<string, ModuleLevel | undefined>> = {};
      for (const u of usersData) initial[u.id] = {};
      for (const g of grantsData) {
        if (!initial[g.userId]) initial[g.userId] = {};
        initial[g.userId][g.moduleKey] = g.level;
      }
      setDraft(initial);
      setLoadErrors(errs);
      setIsLoading(false);

      if (errs.length > 0) {
        toast.error("Algunos datos no se pudieron cargar");
      }
    };
    void load();
  }, []);

  const original = useMemo(() => {
    const map: Record<string, Record<string, ModuleLevel | undefined>> = {};
    for (const u of users) map[u.id] = {};
    for (const g of grants) {
      if (!map[g.userId]) map[g.userId] = {};
      map[g.userId][g.moduleKey] = g.level;
    }
    return map;
  }, [users, grants]);

  const isDirty = (userId: string) =>
    catalog.some(
      (m) => (draft[userId]?.[m.key] ?? null) !== (original[userId]?.[m.key] ?? null),
    );

  const toggle = (userId: string, moduleKey: string) => {
    setDraft((d) => {
      const forUser = { ...(d[userId] ?? {}) };
      forUser[moduleKey] = forUser[moduleKey] ? undefined : "VIEWER";
      return { ...d, [userId]: forUser };
    });
  };

  const setLevel = (userId: string, moduleKey: string, level: ModuleLevel) => {
    setDraft((d) => ({
      ...d,
      [userId]: { ...(d[userId] ?? {}), [moduleKey]: level },
    }));
  };

  const save = async (userId: string) => {
    setSavingUserId(userId);
    try {
      const modules = catalog
        .filter((m) => draft[userId]?.[m.key])
        .map((m) => ({ moduleKey: m.key, level: draft[userId][m.key] as ModuleLevel }));

      const res = await api.put(`/api/modules/grants/${userId}`, { modules });
      const result = res.data?.data;

      // Refrescar las concesiones para que "original" quede al día y el
      // botón de guardar se apague.
      const grt = await api.get("/api/modules/grants");
      setGrants(grt.data?.data ?? []);

      const n = (result?.granted?.length ?? 0) + (result?.revoked?.length ?? 0);
      toast.success(n > 0 ? "Permisos actualizados" : "Sin cambios para guardar");
    } catch {
      toast.error("No se pudieron guardar los permisos");
    } finally {
      setSavingUserId(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <ShieldCheck size={20} /> Acceso a módulos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Habilitá por usuario qué módulos puede usar. Los administradores tienen
          acceso a todo de forma implícita y no aparecen como asignables.
        </p>
      </div>

      {loadErrors.length > 0 && (
        <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm">
          <p className="font-medium text-red-800 dark:text-red-200">
            No se pudo cargar todo
          </p>
          <ul className="mt-1 space-y-0.5 text-red-700 dark:text-red-300 font-mono text-xs">
            {loadErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {loadErrors.length === 0 && catalog.length === 0 && (
        <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
          El catálogo de módulos vino vacío. Revisá que el backend desplegado
          incluya <code>src/lib/modules.ts</code>.
        </div>
      )}

      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Usuario</th>
              <th className="text-left px-4 py-2">Rol</th>
              {catalog.map((m) => (
                <th key={m.key} className="text-left px-4 py-2" title={m.description}>
                  {m.name}
                </th>
              ))}
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => {
              const admin = u.role === "ADMIN";
              return (
                <tr key={u.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">{u.role}</td>
                  {catalog.map((m) => (
                    <td key={m.key} className="px-4 py-2">
                      {admin ? (
                        <span className="text-xs text-muted-foreground">
                          todo (ADMIN)
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!draft[u.id]?.[m.key]}
                            onChange={() => toggle(u.id, m.key)}
                            aria-label={`${m.name} para ${u.name}`}
                          />
                          {draft[u.id]?.[m.key] && (
                            <select
                              value={draft[u.id][m.key]}
                              onChange={(e) =>
                                setLevel(u.id, m.key, e.target.value as ModuleLevel)
                              }
                              className="text-xs rounded border border-border bg-background px-1 py-0.5"
                            >
                              {LEVELS.map((l) => (
                                <option key={l} value={l}>
                                  {LEVEL_LABEL[l]}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    {!admin && isDirty(u.id) && (
                      <button
                        onClick={() => save(u.id)}
                        disabled={savingUserId === u.id}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        {savingUserId === u.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                        Guardar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay usuarios que coincidan con la búsqueda.
        </p>
      )}
    </div>
  );
};

export default AdminModulesPage;
