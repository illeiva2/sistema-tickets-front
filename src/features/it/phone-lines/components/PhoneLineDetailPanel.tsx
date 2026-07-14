import { useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  History,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  UserCheck,
  UserMinus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getPhoneLineErrorInfo } from "../api";
import {
  formatDataAllowance,
  formatPhoneLineCost,
  formatPhoneLineDate,
  formatPhoneLineDateTime,
  phoneLineAssetCode,
  phoneLineAssetName,
  phoneLineCarrier,
  phoneLinePersonName,
} from "../format";
import { PHONE_LINE_STATUS_LABELS, type PhoneLine } from "../types";
import { usePhoneLineDialogFocus } from "../usePhoneLineDialogFocus";
import {
  phoneLineKeys,
  useAssignPhoneLine,
  useCreateSimChange,
  useDeletePhoneLine,
  usePhoneAssets,
  usePhoneLineDetail,
  usePhoneLinePeople,
  usePhoneLineSimChanges,
  useReturnPhoneLine,
} from "../usePhoneLines";

interface PhoneLineDetailPanelProps {
  lineId: string;
  onClose: () => void;
  onEdit: (line: PhoneLine) => void;
  onDeleted: () => void;
}

function optional(value: string): string | null {
  return value.trim() || null;
}

const ASSET_STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "En depósito",
  ASSIGNED: "Asignado",
  IN_REPAIR: "En reparación",
  RETIRED: "Retirado",
  LOST: "Extraviado",
};

const INELIGIBLE_ASSET_STATUSES = new Set(["IN_REPAIR", "RETIRED", "LOST"]);

export function PhoneLineDetailPanel({
  lineId,
  onClose,
  onEdit,
  onDeleted,
}: PhoneLineDetailPanelProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canDelete = user?.role === "ADMIN" || user?.role === "AGENT";
  const detail = usePhoneLineDetail(lineId);
  const simChanges = usePhoneLineSimChanges(lineId);
  const line = detail.data;
  const canAssign = line?.status === "AVAILABLE" && !line.holder;
  const people = usePhoneLinePeople(Boolean(canAssign));
  const assets = usePhoneAssets(Boolean(canAssign));
  const assignLine = useAssignPhoneLine(lineId);
  const returnLine = useReturnPhoneLine(lineId);
  const addSimChange = useCreateSimChange(lineId);
  const deleteLine = useDeletePhoneLine();

  const [personId, setPersonId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [newIccid, setNewIccid] = useState("");
  const [simChangedAt, setSimChangedAt] = useState("");
  const [simReason, setSimReason] = useState("");
  const [simNotes, setSimNotes] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [conflictReloaded, setConflictReloaded] = useState(false);
  const eligibleAssets = (assets.data ?? []).filter((asset) => {
    if (!personId || INELIGIBLE_ASSET_STATUSES.has(asset.status ?? "")) {
      return false;
    }
    if (asset.assignedPersonId && asset.assignedPersonId !== personId) {
      return false;
    }
    return asset.status !== "ASSIGNED" || asset.assignedPersonId === personId;
  });
  const simChangeItems =
    simChanges.data?.pages.flatMap((page) => page.items) ?? [];
  const simChangesTotal =
    simChanges.data?.pages[0]?.pagination.total ?? simChangeItems.length;

  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isBusy =
    assignLine.isPending ||
    returnLine.isPending ||
    addSimChange.isPending ||
    deleteLine.isPending;
  usePhoneLineDialogFocus(dialogRef, closeRef, onClose, isBusy);

  const reloadCurrentData = async () => {
    await queryClient.invalidateQueries({ queryKey: phoneLineKeys.all });
    setConflictReloaded(true);
  };

  const handleActionFailure = async (error: unknown) => {
    const info = getPhoneLineErrorInfo(error);
    setActionError(info.message);
    if (!info.isConflict) return;
    try {
      await reloadCurrentData();
    } catch {
      setActionError(
        `${info.message} Además, no pudimos recargar el estado actual. Reintentá la consulta.`,
      );
    }
  };

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setConflictReloaded(false);
    if (!line) return;
    try {
      await assignLine.mutateAsync({
        expectedUpdatedAt: line.updatedAt,
        personId,
        assetId: assets.isError ? null : optional(assetId),
        note: optional(assignmentNote),
      });
      setPersonId("");
      setAssetId("");
      setAssignmentNote("");
      toast.success("Línea asignada");
    } catch (error) {
      await handleActionFailure(error);
    }
  };

  const handleReturn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setConflictReloaded(false);
    if (!line) return;
    try {
      await returnLine.mutateAsync({
        expectedUpdatedAt: line.updatedAt,
        returnNote: optional(returnNote),
      });
      setReturnNote("");
      toast.success("Línea devuelta al pool disponible");
    } catch (error) {
      await handleActionFailure(error);
    }
  };

  const handleSimChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setConflictReloaded(false);
    if (!/^\d{19,20}$/.test(newIccid)) {
      setActionError("El nuevo ICCID debe contener 19 o 20 dígitos.");
      return;
    }
    if (!line) return;
    try {
      await addSimChange.mutateAsync({
        expectedUpdatedAt: line.updatedAt,
        newIccid,
        ...(simChangedAt
          ? { changedAt: new Date(simChangedAt).toISOString() }
          : {}),
        ...(simReason.trim() ? { reason: simReason.trim() } : {}),
        ...(simNotes.trim() ? { notes: simNotes.trim() } : {}),
      });
      setNewIccid("");
      setSimChangedAt("");
      setSimReason("");
      setSimNotes("");
      toast.success("Cambio de chip registrado");
    } catch (error) {
      await handleActionFailure(error);
    }
  };

  const handleDelete = async () => {
    if (!line || deleteConfirmation !== line.phoneNumber) return;
    setActionError(null);
    setConflictReloaded(false);
    try {
      await deleteLine.mutateAsync({
        id: line.id,
        expectedUpdatedAt: line.updatedAt,
      });
      toast.success("Línea dada de baja del inventario");
      onDeleted();
    } catch (error) {
      await handleActionFailure(error);
    }
  };

  return (
    <div className="staff-dialog-backdrop">
      <section
        ref={dialogRef}
        className="staff-dialog phone-lines-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-line-detail-title"
      >
        <header className="staff-dialog__header">
          <div>
            <span>CONTROL / LÍNEA</span>
            <h2 id="phone-line-detail-title">
              {line?.phoneNumber || "Cargando línea"}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="staff-icon-button"
            aria-label="Cerrar detalle de línea"
            disabled={isBusy}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {detail.isLoading ? (
          <div className="staff-dialog__state" role="status">
            <Loader2 size={24} className="staff-spin" aria-hidden="true" />
            <strong>Consultando línea</strong>
            <p>Cargando servicio, titular e historial.</p>
          </div>
        ) : detail.isError || !line ? (
          <div className="staff-dialog__state" role="alert">
            <AlertTriangle size={24} aria-hidden="true" />
            <strong>No se pudo abrir la línea</strong>
            <p>{getPhoneLineErrorInfo(detail.error).message}</p>
            <button
              type="button"
              className="staff-button staff-button--ghost"
              onClick={() => void detail.refetch()}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : (
          <div className="phone-lines-detail__body">
            <section
              className="phone-lines-detail__summary"
              aria-labelledby="line-summary-title"
            >
              <div className="phone-lines-detail__section-heading">
                <div>
                  <span>01 / SERVICIO</span>
                  <h3 id="line-summary-title">Ficha operativa</h3>
                </div>
                <button
                  type="button"
                  className="staff-button staff-button--ghost"
                  disabled={isBusy}
                  onClick={() => onEdit(line)}
                >
                  <Pencil size={15} aria-hidden="true" />
                  Editar
                </button>
              </div>
              <dl className="phone-lines-detail-grid">
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <span
                      className="phone-lines-status"
                      data-status={line.status}
                    >
                      {PHONE_LINE_STATUS_LABELS[line.status]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Operadora</dt>
                  <dd>{phoneLineCarrier(line)}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>{line.planName || "Sin informar"}</dd>
                </div>
                <div>
                  <dt>Datos</dt>
                  <dd>{formatDataAllowance(line.dataAllowanceGb)}</dd>
                </div>
                <div>
                  <dt>Costo mensual</dt>
                  <dd>{formatPhoneLineCost(line)}</dd>
                </div>
                <div>
                  <dt>Fin de contrato</dt>
                  <dd>{formatPhoneLineDate(line.contractEndsAt)}</dd>
                </div>
                <div>
                  <dt>ICCID actual</dt>
                  <dd className="phone-lines-mono">
                    {line.simIccid || "Sin registrar"}
                  </dd>
                </div>
                <div>
                  <dt>Actualizada</dt>
                  <dd>{formatPhoneLineDateTime(line.updatedAt)}</dd>
                </div>
              </dl>
              {line.notes && (
                <p className="phone-lines-detail__notes">{line.notes}</p>
              )}
            </section>

            <section aria-labelledby="line-custody-title">
              <div className="phone-lines-detail__section-heading">
                <div>
                  <span>02 / CUSTODIA</span>
                  <h3 id="line-custody-title">Asignación actual</h3>
                </div>
              </div>

              {line.holder ? (
                <div className="phone-lines-custody-card">
                  <UserCheck size={22} aria-hidden="true" />
                  <div>
                    <strong>{phoneLinePersonName(line.holder)}</strong>
                    <p>
                      {line.holder.jobTitle ||
                        line.holder.employeeNumber ||
                        "Persona activa"}
                    </p>
                    <small>
                      {phoneLineAssetName(line.asset)} ·{" "}
                      {phoneLineAssetCode(line.asset)}
                    </small>
                  </div>
                </div>
              ) : (
                <div className="phone-lines-custody-card phone-lines-custody-card--empty">
                  <Smartphone size={22} aria-hidden="true" />
                  <div>
                    <strong>Sin titular</strong>
                    <p>La línea no está bajo custodia de una persona.</p>
                  </div>
                </div>
              )}

              {canAssign && (
                <form
                  className="phone-lines-action-form"
                  onSubmit={handleAssign}
                >
                  <h4>Asignar línea</h4>
                  <div className="phone-lines-action-grid">
                    <label>
                      Persona activa
                      <select
                        required
                        value={personId}
                        disabled={
                          people.isLoading ||
                          people.isError ||
                          assignLine.isPending
                        }
                        onChange={(event) => {
                          setPersonId(event.target.value);
                          setAssetId("");
                        }}
                      >
                        <option value="">
                          {people.isLoading
                            ? "Cargando personas"
                            : "Seleccionar persona"}
                        </option>
                        {(people.data ?? []).map((person) => (
                          <option key={person.id} value={person.id}>
                            {phoneLinePersonName(person)}
                            {person.employeeNumber
                              ? ` · ${person.employeeNumber}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Celular <span>Opcional</span>
                      <select
                        value={assetId}
                        disabled={
                          !personId ||
                          assets.isLoading ||
                          assets.isError ||
                          assignLine.isPending
                        }
                        onChange={(event) => setAssetId(event.target.value)}
                      >
                        <option value="">
                          {!personId
                            ? "Elegí primero una persona"
                            : assets.isLoading
                              ? "Cargando celulares"
                              : "Sin equipo vinculado"}
                        </option>
                        {eligibleAssets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {phoneLineAssetName(asset)} ·{" "}
                            {phoneLineAssetCode(asset)} ·{" "}
                            {ASSET_STATUS_LABELS[asset.status ?? ""] ||
                              "Estado no informado"}
                            {asset.assignedPersonId === personId
                              ? " · asignado a esta persona"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Nota de entrega <span>Opcional</span>
                    <input
                      value={assignmentNote}
                      onChange={(event) =>
                        setAssignmentNote(event.target.value)
                      }
                    />
                  </label>
                  {people.isError && (
                    <div className="phone-lines-inline-error" role="alert">
                      No se pudieron cargar las personas activas.
                      <button
                        type="button"
                        onClick={() => void people.refetch()}
                      >
                        Reintentar personas
                      </button>
                    </div>
                  )}
                  {assets.isError && (
                    <div className="phone-lines-inline-error" role="alert">
                      No se cargaron los celulares. Podés asignar la línea sin
                      equipo y vincularlo después.
                      <button
                        type="button"
                        onClick={() => void assets.refetch()}
                      >
                        Reintentar celulares
                      </button>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="staff-button staff-button--primary"
                    disabled={
                      !personId || assignLine.isPending || people.isError
                    }
                  >
                    {assignLine.isPending && (
                      <Loader2
                        size={15}
                        className="staff-spin"
                        aria-hidden="true"
                      />
                    )}
                    <UserCheck size={15} aria-hidden="true" />
                    Confirmar asignación
                  </button>
                </form>
              )}

              {line.holder && (
                <form
                  className="phone-lines-action-form"
                  onSubmit={handleReturn}
                >
                  <h4>Devolver línea</h4>
                  <label>
                    Nota de devolución <span>Opcional</span>
                    <input
                      value={returnNote}
                      disabled={returnLine.isPending}
                      onChange={(event) => setReturnNote(event.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    className="staff-button staff-button--ghost"
                    disabled={returnLine.isPending}
                  >
                    {returnLine.isPending && (
                      <Loader2
                        size={15}
                        className="staff-spin"
                        aria-hidden="true"
                      />
                    )}
                    <UserMinus size={15} aria-hidden="true" />
                    Registrar devolución
                  </button>
                </form>
              )}

              {line.assignments && line.assignments.length > 0 && (
                <details className="phone-lines-history">
                  <summary>
                    Historial de asignaciones ({line.assignments.length})
                  </summary>
                  <ol>
                    {line.assignments.map((assignment) => (
                      <li key={assignment.id}>
                        <strong>
                          {phoneLinePersonName(assignment.person)}
                        </strong>
                        <span>
                          {formatPhoneLineDateTime(assignment.assignedAt)} →{" "}
                          {assignment.returnedAt
                            ? formatPhoneLineDateTime(assignment.returnedAt)
                            : "Actual"}
                        </span>
                        {assignment.asset && (
                          <small>{phoneLineAssetName(assignment.asset)}</small>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </section>

            <section aria-labelledby="line-sim-title">
              <div className="phone-lines-detail__section-heading">
                <div>
                  <span>03 / SIM</span>
                  <h3 id="line-sim-title">Cambios de chip</h3>
                </div>
                <History size={19} aria-hidden="true" />
              </div>

              <form
                className="phone-lines-action-form"
                onSubmit={handleSimChange}
              >
                <div className="phone-lines-action-grid">
                  <label>
                    Nuevo ICCID
                    <input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{19,20}"
                      value={newIccid}
                      placeholder="19 o 20 dígitos"
                      disabled={addSimChange.isPending}
                      onChange={(event) => setNewIccid(event.target.value)}
                    />
                  </label>
                  <label>
                    Fecha del cambio <span>Opcional</span>
                    <input
                      type="datetime-local"
                      value={simChangedAt}
                      disabled={addSimChange.isPending}
                      onChange={(event) => setSimChangedAt(event.target.value)}
                    />
                  </label>
                  <label>
                    Motivo <span>Opcional</span>
                    <input
                      value={simReason}
                      placeholder="Daño, pérdida, renovación…"
                      disabled={addSimChange.isPending}
                      onChange={(event) => setSimReason(event.target.value)}
                    />
                  </label>
                  <label>
                    Nota técnica <span>Opcional</span>
                    <input
                      value={simNotes}
                      disabled={addSimChange.isPending}
                      onChange={(event) => setSimNotes(event.target.value)}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="staff-button staff-button--ghost"
                  disabled={addSimChange.isPending}
                >
                  {addSimChange.isPending && (
                    <Loader2
                      size={15}
                      className="staff-spin"
                      aria-hidden="true"
                    />
                  )}
                  <RefreshCw size={15} aria-hidden="true" />
                  Registrar cambio de chip
                </button>
              </form>

              {simChanges.isLoading ? (
                <p className="phone-lines-history-state" role="status">
                  Cargando historial de SIM…
                </p>
              ) : simChanges.isError ? (
                <div className="phone-lines-inline-error" role="alert">
                  No se pudo cargar el historial de SIM.
                  <button
                    type="button"
                    onClick={() => void simChanges.refetch()}
                  >
                    Reintentar
                  </button>
                </div>
              ) : simChangeItems.length === 0 ? (
                <p className="phone-lines-history-state">
                  Todavía no hay cambios de chip registrados.
                </p>
              ) : (
                <ol className="phone-lines-sim-timeline">
                  {simChangeItems.map((change) => (
                    <li key={change.id}>
                      <span>{formatPhoneLineDateTime(change.changedAt)}</span>
                      <strong className="phone-lines-mono">
                        {change.newIccid}
                      </strong>
                      <p>{change.reason || "Cambio sin motivo informado"}</p>
                      {change.previousIccid && (
                        <small>Anterior: {change.previousIccid}</small>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {simChangeItems.length > 0 && (
                <div className="phone-lines-history-footer" aria-live="polite">
                  <span>
                    Mostrando {simChangeItems.length} de {simChangesTotal}{" "}
                    cambios
                  </span>
                  {simChanges.hasNextPage && (
                    <button
                      type="button"
                      className="staff-button staff-button--ghost"
                      disabled={simChanges.isFetchingNextPage}
                      onClick={() => void simChanges.fetchNextPage()}
                    >
                      {simChanges.isFetchingNextPage && (
                        <Loader2
                          size={15}
                          className="staff-spin"
                          aria-hidden="true"
                        />
                      )}
                      Cargar más cambios
                    </button>
                  )}
                </div>
              )}
            </section>

            {canDelete && (
              <section
                className="phone-lines-danger-zone"
                aria-labelledby="line-delete-title"
              >
                <div className="phone-lines-detail__section-heading">
                  <div>
                    <span>04 / BAJA SEGURA</span>
                    <h3 id="line-delete-title">Retirar del inventario</h3>
                  </div>
                  <ShieldAlert size={19} aria-hidden="true" />
                </div>
                <p>
                  La baja conserva la trazabilidad. Primero devolvé la línea si
                  tiene una asignación vigente y luego escribí el número
                  completo para confirmar.
                </p>
                <label>
                  Confirmar número {line.phoneNumber}
                  <input
                    value={deleteConfirmation}
                    disabled={Boolean(line.holder) || deleteLine.isPending}
                    onChange={(event) =>
                      setDeleteConfirmation(event.target.value)
                    }
                  />
                </label>
                <button
                  type="button"
                  className="phone-lines-danger-button"
                  disabled={
                    Boolean(line.holder) ||
                    deleteConfirmation !== line.phoneNumber ||
                    deleteLine.isPending
                  }
                  onClick={() => void handleDelete()}
                >
                  {deleteLine.isPending && (
                    <Loader2
                      size={15}
                      className="staff-spin"
                      aria-hidden="true"
                    />
                  )}
                  Dar de baja
                </button>
              </section>
            )}

            {actionError && (
              <div
                className="staff-form__error phone-lines-action-error"
                role="alert"
              >
                <AlertTriangle size={16} aria-hidden="true" />
                <div>
                  <strong>{actionError}</strong>
                  {conflictReloaded && (
                    <p>
                      Recargamos el detalle y el listado con la versión actual.
                      Revisá el estado y podés reintentar la operación.
                    </p>
                  )}
                  <button
                    type="button"
                    className="staff-button staff-button--ghost"
                    onClick={() => void reloadCurrentData()}
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                    Recargar datos actuales
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
