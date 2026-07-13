import { useId, useMemo, type ReactNode } from "react";
import {
  Boxes,
  Clock3,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  PackageOpen,
} from "lucide-react";
import {
  parseInventorySnapshot,
  type InventoryCard,
  type InventoryField,
} from "./inventorySnapshot";
import "./inventorySnapshot.css";

export interface InventorySnapshotViewProps {
  payload: unknown;
}

function FieldList({ fields }: { fields: InventoryField[] }) {
  return (
    <dl className="inventory-snapshot__fields">
      {fields.map((field, index) => (
        <div key={`${field.label}-${index}`}>
          <dt>{field.label}</dt>
          <dd className={field.mono ? "inventory-snapshot__mono" : undefined}>
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface CardsSectionProps {
  id: string;
  title: string;
  cards: InventoryCard[];
  icon: ReactNode;
}

function CardsSection({ id, title, cards, icon }: CardsSectionProps) {
  return (
    <section className="inventory-snapshot__section" aria-labelledby={id}>
      <header className="inventory-snapshot__section-header">
        <span aria-hidden="true">{icon}</span>
        <h4 id={id}>{title}</h4>
        {cards.length > 1 ? <small>{cards.length}</small> : null}
      </header>
      <ul className="inventory-snapshot__cards">
        {cards.map((card, index) => (
          <li key={`${card.title}-${index}`}>
            <article>
              <h5>{card.title}</h5>
              <FieldList fields={card.fields} />
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InventorySnapshotView({ payload }: InventorySnapshotViewProps) {
  const parsed = useMemo(() => parseInventorySnapshot(payload), [payload]);
  const reactId = useId().replace(/:/g, "");
  const id = (section: string) => `inventory-${reactId}-${section}`;

  if (parsed.isEmpty) {
    return (
      <div className="inventory-snapshot inventory-snapshot--empty">
        <PackageOpen size={22} aria-hidden="true" />
        <p>No hay datos estructurados disponibles en este snapshot.</p>
      </div>
    );
  }

  return (
    <div
      className="inventory-snapshot"
      aria-label="Detalle del inventario reportado"
    >
      {parsed.collectedAt ? (
        <p className="inventory-snapshot__collected">
          <Clock3 size={14} aria-hidden="true" />
          Relevado por el agente el <time>{parsed.collectedAt}</time>
        </p>
      ) : null}

      <div className="inventory-snapshot__primary">
        {parsed.hardware ? (
          <CardsSection
            id={id("hardware")}
            title="Hardware"
            cards={[parsed.hardware]}
            icon={<Boxes size={16} />}
          />
        ) : null}
        {parsed.cpu ? (
          <CardsSection
            id={id("cpu")}
            title="Procesador"
            cards={[parsed.cpu]}
            icon={<Cpu size={16} />}
          />
        ) : null}
      </div>

      {parsed.memoryModules.length ? (
        <CardsSection
          id={id("memory")}
          title="Módulos de memoria"
          cards={parsed.memoryModules}
          icon={<MemoryStick size={16} />}
        />
      ) : null}

      {parsed.disks.length ? (
        <CardsSection
          id={id("disks")}
          title="Discos"
          cards={parsed.disks}
          icon={<HardDrive size={16} />}
        />
      ) : null}

      {parsed.networkAdapters.length ? (
        <CardsSection
          id={id("network")}
          title="Adaptadores de red"
          cards={parsed.networkAdapters}
          icon={<Network size={16} />}
        />
      ) : null}

      {parsed.software.length ? (
        <section
          className="inventory-snapshot__section"
          aria-labelledby={id("software")}
        >
          <header className="inventory-snapshot__section-header">
            <span aria-hidden="true">
              <PackageOpen size={16} />
            </span>
            <h4 id={id("software")}>Software instalado</h4>
            <small>{parsed.software.length}</small>
          </header>
          <div
            className="inventory-snapshot__table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Listado de software instalado"
          >
            <table className="inventory-snapshot__software">
              <caption className="inventory-snapshot__sr-only">
                Programas informados por el agente
              </caption>
              <thead>
                <tr>
                  <th scope="col">Programa</th>
                  <th scope="col">Versión</th>
                  <th scope="col">Fabricante</th>
                </tr>
              </thead>
              <tbody>
                {parsed.software.map((item, index) => (
                  <tr key={`${item.name}-${item.version}-${index}`}>
                    <th scope="row">{item.name}</th>
                    <td className="inventory-snapshot__mono">{item.version}</td>
                    <td>
                      {item.publisher}
                      {item.details.length ? (
                        <FieldList fields={item.details} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {parsed.other.length ? (
        <section
          className="inventory-snapshot__section inventory-snapshot__section--other"
          aria-labelledby={id("other")}
        >
          <header className="inventory-snapshot__section-header">
            <span aria-hidden="true">
              <Boxes size={16} />
            </span>
            <h4 id={id("other")}>Otros datos</h4>
          </header>
          <FieldList fields={parsed.other} />
        </section>
      ) : null}
    </div>
  );
}

export {
  formatInventoryBytes,
  parseInventorySnapshot,
  sanitizeInventoryPayload,
  suggestAssetFromInventory,
} from "./inventorySnapshot";
export type {
  InventoryAssetSuggestion,
  ParsedInventorySnapshot,
} from "./inventorySnapshot";
