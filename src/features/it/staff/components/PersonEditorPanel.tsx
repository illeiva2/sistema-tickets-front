import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  X,
} from "lucide-react";
import { getStaffErrorInfo } from "../api";
import {
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_STATUS_LABELS,
  type EmploymentStatus,
  type StaffCreatePayload,
  type StaffDepartment,
  type StaffPerson,
  type StaffSaveCommand,
} from "../types";

interface PersonEditorPanelProps {
  mode: "create" | "edit";
  person: StaffPerson | null;
  departments: StaffDepartment[];
  isDepartmentsLoading: boolean;
  departmentsError?: string;
  isLoading: boolean;
  isSaving: boolean;
  loadError?: string;
  onClose: () => void;
  onRetryDepartments: () => void;
  onRetry: () => void;
  onReload: () => Promise<boolean>;
  onSave: (command: StaffSaveCommand) => Promise<void>;
}

interface StaffFormState {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  workEmail: string;
  workPhone: string;
  departmentId: string;
  status: EmploymentStatus;
  startDate: string;
  endDate: string;
  notes: string;
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formStateFromPerson(person: StaffPerson | null): StaffFormState {
  return {
    employeeNumber: person?.employeeNumber ?? "",
    firstName: person?.firstName ?? "",
    lastName: person?.lastName ?? "",
    jobTitle: person?.jobTitle ?? "",
    workEmail: person?.workEmail ?? "",
    workPhone: person?.workPhone ?? "",
    departmentId: person?.departmentId ?? person?.department?.id ?? "",
    status: person?.status ?? "ACTIVE",
    startDate: toDateInput(person?.startDate),
    endDate: toDateInput(person?.endDate),
    notes: person?.notes ?? "",
  };
}

function optionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export function PersonEditorPanel({
  mode,
  person,
  departments,
  isDepartmentsLoading,
  departmentsError,
  isLoading,
  isSaving,
  loadError,
  onClose,
  onRetryDepartments,
  onRetry,
  onReload,
  onSave,
}: PersonEditorPanelProps) {
  const [form, setForm] = useState<StaffFormState>(() =>
    formStateFromPerson(person),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(isSaving);
  const isMountedRef = useRef(true);
  const hydratedPersonVersionRef = useRef(
    mode === "edit" && person ? `${person.id}:${person.updatedAt}` : null,
  );
  const titleId =
    mode === "edit" ? "staff-editor-title-edit" : "staff-editor-title-new";
  const departmentOptions =
    person?.department &&
    !departments.some((department) => department.id === person.department?.id)
      ? [person.department, ...departments]
      : departments;

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  useEffect(() => {
    if (mode !== "edit" || !person) return;

    const personVersion = `${person.id}:${person.updatedAt}`;
    if (hydratedPersonVersionRef.current === personVersion) return;

    hydratedPersonVersionRef.current = personVersion;
    setForm(formStateFromPerson(person));
    setSubmitError(null);
    setConflictMessage(null);
  }, [mode, person]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSavingRef.current) onClose();
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (
        event.shiftKey &&
        (activeElement === first || !dialogRef.current?.contains(activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === last || !dialogRef.current?.contains(activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      if (!isLoading && !loadError) firstInputRef.current?.focus();
      else closeButtonRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [isLoading, loadError]);

  const updateField = <K extends keyof StaffFormState>(
    field: K,
    value: StaffFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitError(null);
  };

  const handleStatusChange = (status: EmploymentStatus) => {
    setForm((current) => ({
      ...current,
      status,
      endDate: status === "TERMINATED" ? current.endDate : "",
    }));
    setSubmitError(null);
  };

  const handleReload = async () => {
    setIsReloading(true);
    setSubmitError(null);
    try {
      const reloaded = await onReload();
      if (reloaded && isMountedRef.current) setConflictMessage(null);
    } catch (error) {
      if (isMountedRef.current)
        setSubmitError(getStaffErrorInfo(error).message);
    } finally {
      if (isMountedRef.current) setIsReloading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (form.status === "TERMINATED" && !form.endDate) {
      setSubmitError(
        "La fecha de egreso es obligatoria al desvincular una persona.",
      );
      return;
    }
    if (
      form.startDate &&
      form.endDate &&
      new Date(form.endDate).getTime() < new Date(form.startDate).getTime()
    ) {
      setSubmitError("La fecha de egreso no puede ser anterior al ingreso.");
      return;
    }

    const payload: StaffCreatePayload = {
      employeeNumber: optionalValue(form.employeeNumber),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      jobTitle: optionalValue(form.jobTitle),
      workEmail: optionalValue(form.workEmail),
      workPhone: optionalValue(form.workPhone),
      departmentId: optionalValue(form.departmentId),
      status: form.status,
      startDate: optionalValue(form.startDate),
      endDate:
        form.status === "TERMINATED" ? optionalValue(form.endDate) : null,
      notes: optionalValue(form.notes),
    };

    try {
      if (mode === "edit") {
        if (!person)
          throw new Error("No se pudo identificar la persona a editar.");
        await onSave({
          mode: "edit",
          id: person.id,
          payload: { ...payload, expectedUpdatedAt: person.updatedAt },
        });
      } else {
        await onSave({ mode: "create", payload });
      }
    } catch (error) {
      const info = getStaffErrorInfo(error);
      if (info.isConflict) setConflictMessage(info.message);
      else setSubmitError(info.message);
    }
  };

  return (
    <div className="staff-dialog-backdrop">
      <section
        ref={dialogRef}
        className="staff-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="staff-dialog__header">
          <div>
            <span>
              {mode === "edit" ? "EDICIÓN / PERSONA" : "ALTA / PERSONA"}
            </span>
            <h2 id={titleId}>
              {mode === "edit" ? "Editar persona" : "Registrar persona"}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="staff-icon-button"
            aria-label="Cerrar panel de persona"
            disabled={isSaving}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {isLoading ? (
          <div className="staff-dialog__state" role="status">
            <Loader2 size={24} className="staff-spin" aria-hidden="true" />
            <strong>Cargando ficha laboral</strong>
            <p>Consultando la versión actual del registro.</p>
          </div>
        ) : loadError ? (
          <div className="staff-dialog__state" role="alert">
            <AlertTriangle size={24} aria-hidden="true" />
            <strong>No se pudo abrir la persona</strong>
            <p>{loadError}</p>
            <button
              type="button"
              className="staff-button staff-button--ghost"
              onClick={onRetry}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : (
          <form className="staff-form" onSubmit={handleSubmit}>
            <fieldset>
              <legend>Identidad laboral</legend>
              <div className="staff-form__grid">
                <label>
                  Legajo <span>Opcional</span>
                  <input
                    value={form.employeeNumber}
                    autoComplete="off"
                    onChange={(event) =>
                      updateField("employeeNumber", event.target.value)
                    }
                  />
                </label>
                <label>
                  Estado
                  <select
                    value={form.status}
                    onChange={(event) =>
                      handleStatusChange(event.target.value as EmploymentStatus)
                    }
                  >
                    {EMPLOYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {EMPLOYMENT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nombre
                  <input
                    ref={firstInputRef}
                    required
                    value={form.firstName}
                    autoComplete="off"
                    onChange={(event) =>
                      updateField("firstName", event.target.value)
                    }
                  />
                </label>
                <label>
                  Apellido
                  <input
                    required
                    value={form.lastName}
                    autoComplete="off"
                    onChange={(event) =>
                      updateField("lastName", event.target.value)
                    }
                  />
                </label>
                <label>
                  Puesto <span>Opcional</span>
                  <input
                    value={form.jobTitle}
                    autoComplete="organization-title"
                    onChange={(event) =>
                      updateField("jobTitle", event.target.value)
                    }
                  />
                </label>
                <label>
                  Sector <span>Opcional</span>
                  <select
                    value={form.departmentId}
                    disabled={isDepartmentsLoading || Boolean(departmentsError)}
                    aria-describedby={
                      departmentsError ? "staff-department-help" : undefined
                    }
                    onChange={(event) =>
                      updateField("departmentId", event.target.value)
                    }
                  >
                    <option value="">
                      {isDepartmentsLoading
                        ? "Cargando sectores"
                        : departmentsError
                          ? "Sectores no disponibles"
                          : "Sin sector"}
                    </option>
                    {departmentOptions.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  {departmentsError && (
                    <small id="staff-department-help">
                      {person?.department
                        ? `Se conserva el sector actual: ${person.department.name}.`
                        : "Reintentá la carga antes de elegir un sector."}
                    </small>
                  )}
                </label>
              </div>
            </fieldset>

            {departmentsError && (
              <div className="staff-form__reference-error" role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                <div>
                  <strong>No se pudieron cargar los sectores</strong>
                  <p>{departmentsError}</p>
                  <button
                    type="button"
                    className="staff-button staff-button--ghost"
                    onClick={onRetryDepartments}
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    Reintentar sectores
                  </button>
                </div>
              </div>
            )}

            <fieldset>
              <legend>Contacto y vigencia laboral</legend>
              <div className="staff-form__grid">
                <label>
                  Email laboral <span>Opcional</span>
                  <input
                    type="email"
                    value={form.workEmail}
                    autoComplete="email"
                    onChange={(event) =>
                      updateField("workEmail", event.target.value)
                    }
                  />
                </label>
                <label>
                  Teléfono laboral <span>Opcional</span>
                  <input
                    type="tel"
                    value={form.workPhone}
                    autoComplete="tel"
                    onChange={(event) =>
                      updateField("workPhone", event.target.value)
                    }
                  />
                </label>
                <label>
                  Fecha de ingreso <span>Opcional</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      updateField("startDate", event.target.value)
                    }
                  />
                </label>
                <label>
                  Fecha de egreso
                  <input
                    type="date"
                    value={form.endDate}
                    required={form.status === "TERMINATED"}
                    disabled={form.status !== "TERMINATED"}
                    aria-describedby="staff-end-date-help"
                    onChange={(event) =>
                      updateField("endDate", event.target.value)
                    }
                  />
                  <small id="staff-end-date-help">
                    Solo corresponde cuando el estado es Desvinculado.
                  </small>
                </label>
              </div>
            </fieldset>

            <div className="staff-privacy-notice" role="note">
              <ShieldAlert size={18} aria-hidden="true" />
              <div>
                <strong>Minimización de datos</strong>
                <p>
                  Registrá únicamente información laboral. No cargues DNI,
                  domicilio, contacto personal, datos de salud ni otra
                  información sensible.
                </p>
              </div>
            </div>

            <label className="staff-form__notes">
              Notas laborales <span>Opcional</span>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </label>

            {conflictMessage && (
              <div className="staff-form__conflict" role="alert">
                <RefreshCw size={18} aria-hidden="true" />
                <div>
                  <strong>Hay una versión más reciente</strong>
                  <p>{conflictMessage}</p>
                  <button
                    type="button"
                    className="staff-button staff-button--ghost"
                    disabled={isReloading}
                    onClick={() => void handleReload()}
                  >
                    {isReloading ? (
                      <Loader2
                        size={15}
                        className="staff-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <RefreshCw size={15} aria-hidden="true" />
                    )}
                    Recargar versión actual
                  </button>
                </div>
              </div>
            )}

            {submitError && (
              <div className="staff-form__error" role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                {submitError}
              </div>
            )}

            <footer className="staff-dialog__footer">
              <button
                type="button"
                className="staff-button staff-button--ghost"
                disabled={isSaving}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="staff-button staff-button--primary"
                disabled={isSaving || Boolean(conflictMessage)}
              >
                {isSaving && (
                  <Loader2
                    size={15}
                    className="staff-spin"
                    aria-hidden="true"
                  />
                )}
                {mode === "edit" ? "Guardar cambios" : "Registrar persona"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
