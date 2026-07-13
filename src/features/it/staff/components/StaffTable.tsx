import { Pencil } from "lucide-react";
import { EMPLOYMENT_STATUS_LABELS, type StaffPerson } from "../types";

interface StaffTableProps {
  people: StaffPerson[];
  openingPersonId: string | null;
  onEdit: (person: StaffPerson) => void;
}

function personName(person: StaffPerson): string {
  return `${person.lastName}, ${person.firstName}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha inválida";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function StaffTable({
  people,
  openingPersonId,
  onEdit,
}: StaffTableProps) {
  return (
    <>
      <div className="staff-table-wrap">
        <table className="staff-table">
          <caption className="sr-only">
            Personal encontrado para los filtros seleccionados
          </caption>
          <thead>
            <tr>
              <th scope="col">Legajo</th>
              <th scope="col">Persona</th>
              <th scope="col">Puesto</th>
              <th scope="col">Sector</th>
              <th scope="col">Estado</th>
              <th scope="col">Ingreso</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td>
                  <span className="staff-employee-number">
                    {person.employeeNumber || "SIN-LEGAJO"}
                  </span>
                </td>
                <td>
                  <strong>{personName(person)}</strong>
                  <small>{person.workEmail || "Sin email laboral"}</small>
                </td>
                <td>{person.jobTitle || "Sin puesto"}</td>
                <td>{person.department?.name || "Sin sector"}</td>
                <td>
                  <span className="staff-status" data-status={person.status}>
                    {EMPLOYMENT_STATUS_LABELS[person.status]}
                  </span>
                </td>
                <td>{formatDate(person.startDate)}</td>
                <td className="staff-table__action">
                  <button
                    type="button"
                    className="staff-icon-button"
                    aria-label={`Editar ${person.firstName} ${person.lastName}`}
                    disabled={openingPersonId === person.id}
                    onClick={() => onEdit(person)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="staff-mobile-list" aria-label="Personal encontrado">
        {people.map((person) => (
          <li key={person.id}>
            <article>
              <div className="staff-mobile-card__topline">
                <span className="staff-employee-number">
                  {person.employeeNumber || "SIN-LEGAJO"}
                </span>
                <span className="staff-status" data-status={person.status}>
                  {EMPLOYMENT_STATUS_LABELS[person.status]}
                </span>
              </div>
              <h3>{personName(person)}</h3>
              <p>{person.jobTitle || "Sin puesto informado"}</p>
              <dl>
                <div>
                  <dt>Sector</dt>
                  <dd>{person.department?.name || "No informado"}</dd>
                </div>
                <div>
                  <dt>Email laboral</dt>
                  <dd>{person.workEmail || "No informado"}</dd>
                </div>
                <div>
                  <dt>Teléfono laboral</dt>
                  <dd>{person.workPhone || "No informado"}</dd>
                </div>
                <div>
                  <dt>Ingreso</dt>
                  <dd>{formatDate(person.startDate)}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="staff-button staff-button--ghost"
                disabled={openingPersonId === person.id}
                onClick={() => onEdit(person)}
              >
                <Pencil size={15} aria-hidden="true" />
                Editar persona
              </button>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
