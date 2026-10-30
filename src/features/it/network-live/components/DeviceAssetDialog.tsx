import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type InputHTMLAttributes,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Link2, Link2Off, Loader2, Plus, X } from "lucide-react";
import { fetchAssets } from "@/features/it/inventory/api";
import { assetKeys } from "@/features/it/inventory/useAssets";
import {
  ASSET_STATUS_LABELS,
  ASSET_TAG_FORMAT_MESSAGE,
  ASSET_TAG_PATTERN,
  type ItAsset,
} from "@/features/it/inventory/types";
import { getNetworkLiveErrorMessage } from "../api";
import type { LiveDevice, LiveDeviceAssetDraft } from "../types";
import { useCreateDeviceAsset, useLinkDeviceAsset } from "../useNetworkLive";
import { AssetLink } from "./AssetLink";
import type { DeviceAssetMode } from "./DeviceInventory";

const ROLE_NAMES: Record<string, string> = { router: "Router", core: "Núcleo", access: "Switch", ap: "AP" };

/** Fichas que se pueden vincular a un equipo de la red ("Otro": las cargadas antes así). */
const LINKABLE_TYPES = ["NETWORK_DEVICE", "OTHER"] as const;
const SEARCH_DELAY_MS = 300;

/**
 * Etiqueta que se propone al dar de alta: el nombre del equipo sin dominio, en mayúsculas, sin
 * tildes y con guiones. Si no cumple el formato queda vacía y el inventario genera una (NET-0001…).
 */
export function tagFromDeviceName(name: string): string {
  const tag = (name.trim().split(".")[0] ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
  return ASSET_TAG_PATTERN.test(tag) ? tag : "";
}

/** Campo de texto del diálogo: el error queda fuera de la etiqueta y se asocia con aria-describedby. */
function TextField({
  label,
  error,
  wide = false,
  inputRef,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  wide?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  return (
    <div className={wide ? "netlive-dialog__field netlive-dialog__field--wide" : "netlive-dialog__field"}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={inputRef}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...input}
      />
      {error ? (
        <small id={`${id}-error`} role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
}

/** Fichas de equipos de red (y "Otro") que no están dadas de baja, para elegir cuál es este equipo. */
async function fetchLinkableAssets(q: string): Promise<ItAsset[]> {
  const pages = await Promise.all(
    LINKABLE_TYPES.map((type) =>
      fetchAssets({ q, type, status: "", assignedDepartmentId: "", assignedPersonId: "", page: 1, pageSize: 20 }),
    ),
  );
  return pages.flatMap((page) => page.items).filter((asset) => asset.status !== "RETIRED");
}

interface CreateForm {
  assetTag: string;
  brand: string;
  model: string;
  serialNumber: string;
  location: string;
}

function initialForm(device: LiveDevice): CreateForm {
  return {
    assetTag: tagFromDeviceName(device.name),
    brand: device.vendor ?? "",
    model: device.model ?? "",
    serialNumber: device.serialNumber ?? "",
    location: "",
  };
}

function draftFrom(form: CreateForm, device: LiveDevice): LiveDeviceAssetDraft {
  const assetTag = form.assetTag.trim().toUpperCase();
  return {
    type: "NETWORK_DEVICE",
    status: "IN_STOCK",
    brand: form.brand.trim(),
    model: form.model.trim(),
    serialNumber: form.serialNumber.trim() || null,
    ...(assetTag ? { assetTag } : {}),
    location: form.location.trim() || null,
    ...(device.macAddress ? { specs: { mac: device.macAddress } } : {}),
  };
}

/**
 * Ficha del inventario de un router, switch o AP: vincular una que ya está cargada o darlo de alta
 * con lo que informa el equipo. Se abre sobre el diagrama, fuera del lienzo.
 */
export function DeviceAssetDialog({
  device,
  initialMode,
  onClose,
}: {
  device: LiveDevice;
  initialMode: DeviceAssetMode;
  onClose: () => void;
}) {
  const titleId = useId();
  const [mode, setMode] = useState<DeviceAssetMode>(initialMode);
  const facts = [
    ROLE_NAMES[device.role] ?? device.role,
    device.managementIp,
    device.model,
    device.serialNumber ? `serie ${device.serialNumber}` : null,
  ];
  const link = useLinkDeviceAsset();
  const create = useCreateDeviceAsset();
  const busy = link.isPending || create.isPending;
  // Al cambiar de pestaña no queda el error de la otra.
  const switchTo = (next: DeviceAssetMode) => {
    link.reset();
    create.reset();
    setMode(next);
  };

  // Escape cierra (salvo mientras se guarda) y el fondo no se desplaza, como los demás modales.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [busy, onClose]);

  const linkTo = (asset: ItAsset | null) =>
    link.mutate(
      { deviceId: device.id, assetId: asset?.id ?? null },
      {
        onSuccess: (result) => {
          // Al desvincular, si el número de serie coincide con una ficha, se lo sigue reconociendo.
          const bySerial = result.asset ? `; sigue reconocido por número de serie (${result.asset.assetTag})` : "";
          toast.success(
            asset
              ? `${device.name}: vinculado a ${result.asset?.assetTag ?? asset.assetTag}`
              : `${device.name}: ficha desvinculada${bySerial}`,
          );
          onClose();
        },
      },
    );

  return createPortal(
    <div className="netlive-dialog" onClick={busy ? undefined : onClose}>
      <div
        className="netlive-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="netlive-dialog__head">
          <div>
            <h2 id={titleId}>Inventario de {device.name}</h2>
            <p>{facts.filter(Boolean).join(" · ")}</p>
          </div>
          <button type="button" className="network-icon-button" aria-label="Cerrar" disabled={busy} onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="netlive-segmented" role="tablist" aria-label="Qué hacer">
          <button type="button" role="tab" aria-selected={mode === "link"} onClick={() => switchTo("link")}>
            <Link2 size={13} aria-hidden="true" />
            Vincular una ficha
          </button>
          <button type="button" role="tab" aria-selected={mode === "create"} onClick={() => switchTo("create")}>
            <Plus size={13} aria-hidden="true" />
            Dar de alta
          </button>
        </div>

        {mode === "link" ? (
          <LinkPanel device={device} busy={busy} onLink={linkTo} />
        ) : (
          <CreatePanel
            device={device}
            busy={busy}
            onCreate={(draft) =>
              create.mutate(
                { deviceId: device.id, asset: draft },
                {
                  onSuccess: (result) => {
                    toast.success(`${result.asset?.assetTag ?? "Ficha"}: creada y vinculada a ${device.name}`);
                    onClose();
                  },
                },
              )
            }
          />
        )}

        {link.isError || create.isError ? (
          <p className="netlive-dialog__error" role="alert">
            {getNetworkLiveErrorMessage(link.error ?? create.error)}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function LinkPanel({
  device,
  busy,
  onLink,
}: {
  device: LiveDevice;
  busy: boolean;
  onLink: (asset: ItAsset | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search]);
  const candidates = useQuery({
    queryKey: [...assetKeys.all, "linkable", query],
    queryFn: () => fetchLinkableAssets(query),
    staleTime: 15_000,
  });
  const current = device.asset;

  return (
    <div className="netlive-dialog__body">
      <div className="netlive-dialog__current">
        {current ? (
          <>
            <span>
              {device.assetLink === "serial" ? "Reconocido por número de serie: " : "Vinculado a "}
              <strong>{current.assetTag}</strong>
            </span>
            <AssetLink asset={current} />
            {device.assetLink === "manual" ? (
              <button
                type="button"
                className="network-button network-button--ghost"
                disabled={busy}
                onClick={() => onLink(null)}
              >
                <Link2Off size={14} aria-hidden="true" />
                Desvincular
              </button>
            ) : null}
          </>
        ) : (
          <span>Sin ficha. Elegí cuál es en el inventario o dalo de alta.</span>
        )}
      </div>

      <TextField
        label="Buscar en el inventario"
        type="search"
        value={search}
        placeholder="Etiqueta, marca, modelo o serie"
        onChange={(event) => setSearch(event.target.value)}
      />

      {candidates.isLoading ? (
        <p className="netlive-hint" role="status">
          <Loader2 size={13} className="network-spin" aria-hidden="true" /> Buscando fichas…
        </p>
      ) : candidates.isError ? (
        <p className="netlive-dialog__error" role="alert">
          No se pudo leer el inventario: {getNetworkLiveErrorMessage(candidates.error)}
        </p>
      ) : !candidates.data?.length ? (
        <p className="netlive-hint">
          {query
            ? `No hay equipos de red con «${query}» en el inventario.`
            : "No hay equipos de red cargados en el inventario."}
        </p>
      ) : (
        <ul className="netlive-dialog__list" aria-label="Fichas del inventario">
          {candidates.data.map((asset) => (
            <li key={asset.id}>
              <div>
                <strong>{asset.assetTag ?? "Sin etiqueta"}</strong>
                <span>{[asset.brand, asset.model].filter(Boolean).join(" ")}</span>
                <small>
                  {[
                    asset.serialNumber ? `serie ${asset.serialNumber}` : null,
                    asset.location,
                    ASSET_STATUS_LABELS[asset.status],
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </div>
              {asset.id === current?.id && device.assetLink === "manual" ? (
                <span className="netlive-dialog__badge">Vinculada</span>
              ) : (
                <button
                  type="button"
                  className="network-button"
                  disabled={busy}
                  aria-label={`Vincular ${asset.assetTag ?? asset.model}`}
                  onClick={() => onLink(asset)}
                >
                  Vincular
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreatePanel({
  device,
  busy,
  onCreate,
}: {
  device: LiveDevice;
  busy: boolean;
  onCreate: (draft: LiveDeviceAssetDraft) => void;
}) {
  const [form, setForm] = useState<CreateForm>(() => initialForm(device));
  const [errors, setErrors] = useState<Partial<Record<keyof CreateForm, string>>>({});
  const firstField = useRef<HTMLInputElement>(null);
  useEffect(() => firstField.current?.focus(), []);

  const field = (key: keyof CreateForm) => ({
    value: form[key],
    error: errors[key],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const tag = form.assetTag.trim().toUpperCase();
    const next = {
      ...(tag && !ASSET_TAG_PATTERN.test(tag) ? { assetTag: ASSET_TAG_FORMAT_MESSAGE } : {}),
      ...(!form.brand.trim() ? { brand: "Falta la marca." } : {}),
      ...(!form.model.trim() ? { model: "Falta el modelo." } : {}),
    };
    setErrors(next);
    if (Object.keys(next).length) return;
    onCreate(draftFrom(form, device));
  };

  return (
    <form className="netlive-dialog__body" onSubmit={submit} noValidate>
      <div className="netlive-dialog__grid">
        <TextField
          label="Etiqueta"
          inputRef={firstField}
          {...field("assetTag")}
          placeholder="Si queda vacía se genera (NET-0001…)"
        />
        <TextField label="Número de serie" {...field("serialNumber")} />
        <TextField label="Marca" {...field("brand")} />
        <TextField label="Modelo" {...field("model")} />
        <TextField label="Ubicación" wide {...field("location")} placeholder="Por ejemplo: rack de oficinas" />
      </div>
      <p className="netlive-hint">
        Se crea como «{ASSET_STATUS_LABELS.IN_STOCK}» y queda vinculada a {device.name}. El estado y la
        asignación a un sector se cambian desde el inventario.
      </p>
      <div className="netlive-dialog__actions">
        <button type="submit" className="network-button" disabled={busy}>
          {busy ? (
            <Loader2 size={14} className="network-spin" aria-hidden="true" />
          ) : (
            <Plus size={14} aria-hidden="true" />
          )}
          Crear la ficha
        </button>
      </div>
    </form>
  );
}
