import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  Loader2,
  PackagePlus,
  UserRound,
  X,
} from "lucide-react";
import type {
  CustodyDepartment,
  CustodyPerson,
} from "../../inventory/custody/types";
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  type AssetType,
} from "../../inventory/types";
import {
  buildAgentAssetOnboardingSubmission,
  mapAgentToAssetOnboardingForm,
  type AgentAssetOnboardingFormValues,
  type AgentAssetOnboardingSubmission,
} from "../agentAssetOnboarding";
import type { AgentDevice } from "../types";
import { useLiveDialogFocus } from "../useDialogFocus";
import "./AgentAssetOnboardingPanel.css";

export interface AgentAssetOnboardingPanelProps {
  device: AgentDevice;
  latestSnapshotPayload?: Record<string, unknown> | null;
  people: CustodyPerson[];
  departments: CustodyDepartment[];
  isLoading: boolean;
  isSaving: boolean;
  canSetAssetTag?: boolean;
  loadError?: string;
  lookupsError?: string;
  saveError?: string;
  onSubmit: (
    submission: AgentAssetOnboardingSubmission,
  ) => Promise<void> | void;
  onClose: () => void;
}

function personName(person: CustodyPerson): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "No se pudo completar el alta. Revisá los datos e intentá nuevamente.";
}

export function AgentAssetOnboardingPanel({
  device,
  latestSnapshotPayload,
  people,
  departments,
  isLoading,
  isSaving,
  canSetAssetTag = false,
  loadError,
  lookupsError,
  saveError,
  onSubmit,
  onClose,
}: AgentAssetOnboardingPanelProps) {
  const [form, setForm] = useState<AgentAssetOnboardingFormValues>(() =>
    mapAgentToAssetOnboardingForm(device, latestSnapshotPayload),
  );
  const [localError, setLocalError] = useState<string>();
  const hydratedDeviceRef = useRef(isLoading ? null : device.id);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);
  const titleId = `agent-asset-onboarding-title-${device.id}`;
  const descriptionId = `agent-asset-onboarding-description-${device.id}`;
  useLiveDialogFocus(dialogRef, closeButtonRef, onClose, isSaving);

  useEffect(() => {
    if (isLoading || hydratedDeviceRef.current === device.id) return;
    setForm(mapAgentToAssetOnboardingForm(device, latestSnapshotPayload));
    hydratedDeviceRef.current = device.id;
  }, [device, isLoading, latestSnapshotPayload]);

  useEffect(() => {
    if (!isLoading) brandInputRef.current?.focus();
  }, [isLoading]);

  const updateField = <K extends keyof AgentAssetOnboardingFormValues>(
    field: K,
    value: AgentAssetOnboardingFormValues[K],
  ) => setForm((current) => ({ ...current, [field]: value }));

  const selectedPerson = people.find((person) => person.id === form.personId);
  const selectedDepartment = departments.find(
    (department) => department.id === form.departmentId,
  );
  const hasCustody = Boolean(selectedPerson || selectedDepartment);
  const custodyLabel = [
    selectedPerson ? personName(selectedPerson) : "",
    selectedDepartment ? `sector ${selectedDepartment.name}` : "",
  ]
    .filter(Boolean)
    .join(" y ");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(undefined);
    try {
      await onSubmit(
        buildAgentAssetOnboardingSubmission({
          ...form,
          assetTag: canSetAssetTag ? form.assetTag : "",
        }),
      );
    } catch (error) {
      setLocalError(errorMessage(error));
    }
  };

  return (
    <div className="live-dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="live-dialog live-onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={isSaving}
      >
        <header className="live-dialog-header">
          <div>
            <span>AGENTE / ALTA PATRIMONIAL</span>
            <h2 id={titleId}>Crear activo desde {device.hostname}</h2>
            <p id={descriptionId}>
              Revisá lo detectado antes de crear, vincular y, si corresponde,
              asignar el equipo.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="live-icon-button"
            aria-label="Cerrar alta de activo"
            disabled={isSaving}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {isLoading ? (
          <div className="live-dialog-state" role="status">
            <Loader2 className="live-onboarding-spin" aria-hidden="true" />
            <strong>Preparando datos reportados</strong>
            <p>Estamos leyendo el último inventario recibido del agente.</p>
          </div>
        ) : (
          <form className="live-onboarding-form" onSubmit={handleSubmit}>
            {loadError ? (
              <div className="live-onboarding-alert" role="alert">
                <AlertTriangle size={17} aria-hidden="true" />
                <div>
                  <strong>El snapshot no se pudo cargar por completo</strong>
                  <p>
                    {loadError} Podés continuar con los datos disponibles y
                    completar lo faltante manualmente.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="live-onboarding-source" role="note">
              <DatabaseZap size={18} aria-hidden="true" />
              <div>
                <strong>Datos precargados, no confirmados</strong>
                <p>
                  Comparalos con la etiqueta física del equipo. La marca y el
                  modelo son obligatorios; el resto puede corregirse.
                </p>
              </div>
            </div>

            <fieldset disabled={isSaving}>
              <legend>Identificación y estado inicial</legend>
              <div className="live-onboarding-grid">
                <label>
                  Tipo
                  <select
                    value={form.type}
                    onChange={(event) =>
                      updateField("type", event.target.value as AssetType)
                    }
                  >
                    {ASSET_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {ASSET_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Estado inicial
                  <input value="En depósito" readOnly aria-readonly="true" />
                  <small>
                    Si elegís custodia, se asignará después de crear el activo.
                  </small>
                </label>
                <label>
                  Marca
                  <input
                    ref={brandInputRef}
                    required
                    autoComplete="off"
                    value={form.brand}
                    onChange={(event) =>
                      updateField("brand", event.target.value)
                    }
                  />
                </label>
                <label>
                  Modelo
                  <input
                    required
                    autoComplete="off"
                    value={form.model}
                    onChange={(event) =>
                      updateField("model", event.target.value)
                    }
                  />
                </label>
                <label>
                  Número de serie <span>Opcional</span>
                  <input
                    autoComplete="off"
                    value={form.serialNumber}
                    onChange={(event) =>
                      updateField("serialNumber", event.target.value)
                    }
                  />
                </label>
                {canSetAssetTag ? (
                  <label>
                    Etiqueta interna <span>Opcional · Administrador</span>
                    <input
                      autoComplete="off"
                      placeholder="Se genera si queda vacía"
                      value={form.assetTag}
                      onChange={(event) =>
                        updateField("assetTag", event.target.value)
                      }
                    />
                  </label>
                ) : null}
                <label>
                  Ubicación <span>Opcional</span>
                  <input
                    autoComplete="off"
                    value={form.location}
                    onChange={(event) =>
                      updateField("location", event.target.value)
                    }
                  />
                </label>
              </div>
            </fieldset>

            <fieldset disabled={isSaving}>
              <legend>Hardware reportado</legend>
              <div className="live-onboarding-grid">
                <label>
                  CPU <span>Opcional</span>
                  <input
                    autoComplete="off"
                    value={form.cpu}
                    onChange={(event) => updateField("cpu", event.target.value)}
                  />
                </label>
                <label>
                  RAM (GB) <span>Opcional</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.ramGb}
                    onChange={(event) =>
                      updateField("ramGb", event.target.value)
                    }
                  />
                </label>
                <label>
                  Almacenamiento <span>Opcional</span>
                  <input
                    autoComplete="off"
                    placeholder="Ej. C: · NVMe · 512 GB"
                    value={form.storage}
                    onChange={(event) =>
                      updateField("storage", event.target.value)
                    }
                  />
                </label>
                <label>
                  Sistema operativo <span>Opcional</span>
                  <input
                    autoComplete="off"
                    value={form.os}
                    onChange={(event) => updateField("os", event.target.value)}
                  />
                </label>
                <label>
                  MAC principal <span>Opcional</span>
                  <input
                    autoComplete="off"
                    value={form.mac}
                    onChange={(event) => updateField("mac", event.target.value)}
                  />
                </label>
              </div>
              <label className="live-onboarding-notes">
                Notas del activo <span>Opcional</span>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                />
              </label>
            </fieldset>

            <fieldset disabled={isSaving || Boolean(lookupsError)}>
              <legend>Custodia opcional</legend>
              <div className="live-onboarding-custody-intro">
                <UserRound size={17} aria-hidden="true" />
                <p>
                  No se asignará al usuario conectado automáticamente. Elegí
                  explícitamente una persona, un sector o ambos.
                </p>
              </div>
              {lookupsError ? (
                <div className="live-onboarding-alert" role="alert">
                  <AlertTriangle size={17} aria-hidden="true" />
                  <div>
                    <strong>Custodia no disponible</strong>
                    <p>
                      {lookupsError} Podés crear el activo sin asignarlo y
                      completar la custodia más tarde.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="live-onboarding-grid">
                    <label>
                      Persona <span>Opcional</span>
                      <select
                        aria-label="Persona de custodia"
                        value={form.personId}
                        onChange={(event) =>
                          updateField("personId", event.target.value)
                        }
                      >
                        <option value="">Sin persona</option>
                        {people.map((person) => (
                          <option key={person.id} value={person.id}>
                            {personName(person)}
                            {person.employeeNumber
                              ? ` · ${person.employeeNumber}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Sector <span>Opcional</span>
                      <select
                        aria-label="Sector de custodia"
                        value={form.departmentId}
                        onChange={(event) =>
                          updateField("departmentId", event.target.value)
                        }
                      >
                        <option value="">Sin sector</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="live-onboarding-notes">
                    Observación de entrega <span>Opcional</span>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={form.custodyNote}
                      disabled={!hasCustody}
                      onChange={(event) =>
                        updateField("custodyNote", event.target.value)
                      }
                    />
                  </label>
                </>
              )}
            </fieldset>

            <section
              className="live-onboarding-review"
              aria-labelledby="agent-onboarding-review-title"
              aria-live="polite"
            >
              <CheckCircle2 size={19} aria-hidden="true" />
              <div>
                <h3 id="agent-onboarding-review-title">Antes de confirmar</h3>
                <p>
                  {hasCustody
                    ? `Se creará el activo en depósito, se vinculará con ${device.hostname} y luego se asignará a ${custodyLabel}.`
                    : `Se creará el activo en depósito y se vinculará con ${device.hostname}, sin custodia. Podrás asignarlo después.`}
                </p>
              </div>
            </section>

            {localError || saveError ? (
              <div className="live-onboarding-alert" role="alert">
                <AlertTriangle size={17} aria-hidden="true" />
                <div>
                  <strong>No se pudo completar el alta</strong>
                  <p>{localError ?? saveError}</p>
                </div>
              </div>
            ) : null}

            <footer className="live-dialog-footer live-onboarding-footer">
              <button
                type="button"
                className="live-button live-button--ghost"
                disabled={isSaving}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="live-button live-button--primary"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2
                    size={15}
                    className="live-onboarding-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <PackagePlus size={15} aria-hidden="true" />
                )}
                {hasCustody
                  ? "Crear, vincular y asignar"
                  : "Crear y vincular activo"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
