import { useState } from "react";
import { ListPlus, Trash2 } from "lucide-react";
import {
  formatObstacleFaultDetail,
  OBSTACLE_POSITIONS,
  obstacleFaultConflicts,
  obstacleFaultsTotal,
  obstacleRulesForPosition,
} from "../domain/obstacleFaults";
import type {
  ObstacleFaultDetail,
  ObstacleFaultPosition,
} from "../domain/types";
import { Button } from "./ui/button";

interface ObstacleReferencePosition {
  id: Exclude<ObstacleFaultPosition, "position-independent">;
  x: number;
  y: number;
  width: number;
  height: number;
}

const OBSTACLE_REFERENCE_POSITIONS: readonly ObstacleReferencePosition[] = [
  { id: "hurdle-1", x: 105, y: 471, width: 30, height: 14 },
  { id: "oxer", x: 104, y: 408, width: 29, height: 18 },
  { id: "tunnel", x: 105, y: 357, width: 19, height: 39 },
  { id: "plank", x: 105, y: 290, width: 11, height: 39 },
  { id: "barrel", x: 105, y: 238, width: 27, height: 18 },
  { id: "hoop", x: 105, y: 186, width: 30, height: 23 },
  { id: "high-long", x: 105, y: 109, width: 30, height: 22 },
  { id: "hurdle-2", x: 105, y: 55, width: 30, height: 13 },
];

const OBSTACLE_REFERENCE_IMAGE = `${import.meta.env.BASE_URL}obstacle-course-ths.svg`;

const positionName = (position: ObstacleFaultPosition) =>
  OBSTACLE_POSITIONS.find(({ id }) => id === position)?.label ?? position;

export function ObstacleFaultDetails({
  details,
  onChange,
}: {
  details: ObstacleFaultDetail[];
  onChange: (details: ObstacleFaultDetail[]) => void;
}) {
  const [expanded, setExpanded] = useState(details.length > 0);
  const [position, setPosition] = useState<ObstacleFaultPosition | null>(null);
  const rules = position ? obstacleRulesForPosition(position) : [];
  const faultedPositions = new Set(details.map((detail) => detail.position));

  const selectFromKeyboard = (
    event: React.KeyboardEvent<SVGGElement>,
    next: ObstacleFaultPosition,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPosition(next);
    }
  };
  const add = (code: (typeof rules)[number]["code"]) => {
    if (!position) return;
    const rule = rules.find((candidate) => candidate.code === code);
    if (!rule || obstacleFaultConflicts(details, position, code)) return;
    onChange([
      ...details,
      { id: crypto.randomUUID(), position, code: rule.code, points: rule.points },
    ]);
  };

  return (
    <section className="hurdle-details" aria-label="Hindernislauffehler im Detail">
      <button
        type="button"
        className="hurdle-details-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span><ListPlus aria-hidden="true" />Optionale Detailangaben zu Hindernislauffehlern</span>
        <strong>{details.length ? `${details.length} Einträge · ${obstacleFaultsTotal(details)} FP` : "Keine Details"}</strong>
      </button>

      {expanded ? (
        <div className="hurdle-details-content">
          <p className="slalom-rule-note">
            Die Laufzeit wird mit −1 Punkt je Sekunde berücksichtigt. Ein
            Doppelsprung am Hoch-Weit sowie das Aufsetzen an Hürde oder Tonne
            verursachen allein keinen Fehlerabzug.
          </p>
          <div>
            <p className="label">1. Hindernis im Schaubild auswählen</p>
            <figure className="hurdle-course obstacle-course obstacle-reference-course">
              <figcaption>
                Gültig für VDH-VK1, VDH-VK2, VDH-VK3, VDH-S-VK, VDH-DK und VDH-HL
              </figcaption>
              <div className="obstacle-reference-stage">
                <img
                  src={OBSTACLE_REFERENCE_IMAGE}
                  width="259"
                  height="560"
                  alt="Hindernislauf mit acht beschrifteten Hindernissen, Start und Zieltor"
                />
                <svg
                  viewBox="0 0 259 560"
                  role="group"
                  aria-label="Fehlerposition auf dem Hindernislauf-Schaubild auswählen"
                >
                  {OBSTACLE_REFERENCE_POSITIONS.map((item) => {
                    const hasFault = faultedPositions.has(item.id);
                    const left = item.x - item.width / 2;
                    const top = item.y - item.height / 2;
                    return (
                      <g
                        className={`obstacle-reference-hotspot ${position === item.id ? "selected" : ""} ${hasFault ? "has-fault" : ""}`}
                        data-position={item.id}
                        data-faulted={hasFault ? "true" : "false"}
                        role="button"
                        tabIndex={0}
                        aria-label={`${positionName(item.id)} auswählen${hasFault ? ", Fehler erfasst" : ""}`}
                        aria-pressed={position === item.id}
                        onClick={() => setPosition(item.id)}
                        onKeyDown={(event) =>
                          selectFromKeyboard(event, item.id)
                        }
                        key={item.id}
                      >
                        <rect
                          className="obstacle-reference-touch-target"
                          x={item.x - 28}
                          y={item.y - 22}
                          width="56"
                          height="44"
                          rx="8"
                        />
                        <rect
                          className="obstacle-reference-hit-area"
                          x={left}
                          y={top}
                          width={item.width}
                          height={item.height}
                          rx="3"
                        />
                        {hasFault ? (
                          <g
                            className="obstacle-reference-fault-badge"
                            aria-hidden="true"
                            transform={`translate(${left + item.width} ${top})`}
                          >
                            <circle r="9" />
                            <text y="4" textAnchor="middle">!</text>
                          </g>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </figure>
            <button
              type="button"
              className={`hurdle-independent ${position === "position-independent" ? "selected" : ""} ${faultedPositions.has("position-independent") ? "has-fault" : ""}`}
              aria-pressed={position === "position-independent"}
              onClick={() => setPosition("position-independent")}
            >Positionsunabhängiger Fehler</button>
          </div>

          <div>
            <p className="label">
              {position
                ? `2. Fehler an „${positionName(position)}“ auswählen`
                : "2. Zuerst ein Hindernis auswählen"}
            </p>
            {position ? (
              <div className="hurdle-rule-list">
                {rules.map((rule) => {
                  const blocked = obstacleFaultConflicts(details, position, rule.code);
                  return (
                    <button type="button" disabled={blocked} onClick={() => add(rule.code)} key={rule.code}>
                      <span><strong>{rule.label}</strong><small>{blocked ? "Für dieses Hindernis bereits oder widersprüchlich erfasst." : rule.explanation}</small></span>
                      <b>−{rule.points} FP</b>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="hurdle-position-help">
                Tippe auf eines der acht Hindernisse in der Grafik.
              </p>
            )}
          </div>

          <div className="hurdle-detail-list" aria-live="polite">
            <p className="label">Erfasste Detailfehler</p>
            {details.length ? (
              <ul>{details.map((detail) => (
                <li key={detail.id}>
                  <span>{formatObstacleFaultDetail(detail)}</span>
                  <Button type="button" variant="ghost" aria-label={`${formatObstacleFaultDetail(detail)} entfernen`} onClick={() => onChange(details.filter((candidate) => candidate.id !== detail.id))}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ))}</ul>
            ) : <p className="text-sm text-muted">Noch keine Detailfehler erfasst. Die direkte Eingabe der Fehlerpunkte bleibt möglich.</p>}
          </div>
        </div>
      ) : null}
    </section>
  );
}
