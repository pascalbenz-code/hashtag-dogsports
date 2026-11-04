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

const COURSE: ReadonlyArray<{
  id: Exclude<ObstacleFaultPosition, "position-independent">;
  number: number;
  y: number;
}> = [
  { id: "hurdle-1", number: 2, y: 424 },
  { id: "oxer", number: 3, y: 374 },
  { id: "tunnel", number: 4, y: 324 },
  { id: "plank", number: 5, y: 274 },
  { id: "barrel", number: 6, y: 224 },
  { id: "hoop", number: 7, y: 174 },
  { id: "high-long", number: 8, y: 124 },
  { id: "hurdle-2", number: 9, y: 74 },
];

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
  const [position, setPosition] = useState<ObstacleFaultPosition>("hurdle-1");
  const rules = obstacleRulesForPosition(position);

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
            <figure className="hurdle-course obstacle-course">
              <figcaption>Schaubild HL · schematische Darstellung</figcaption>
              <svg viewBox="0 0 360 500" role="group" aria-label="Hindernislauf mit Start, acht beschrifteten Hindernissen und Ziel">
                <defs>
                  <marker id="obstacle-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L7,3 z" />
                  </marker>
                </defs>
                <path className="hurdle-route" markerEnd="url(#obstacle-arrow)" d="M180 474 V30" />
                <text className="course-end-label" x="180" y="491" textAnchor="middle">1 · Start</text>
                <text className="course-end-label" x="180" y="18" textAnchor="middle">10 · Ziel</text>
                {COURSE.map((item) => (
                  <g
                    className={`obstacle-position ${position === item.id ? "selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${positionName(item.id)} auswählen`}
                    aria-pressed={position === item.id}
                    onClick={() => setPosition(item.id)}
                    onKeyDown={(event) => selectFromKeyboard(event, item.id)}
                    key={item.id}
                  >
                    <rect x="151" y={item.y - 16} width="58" height="32" rx="5" />
                    <circle cx="180" cy={item.y} r="22" />
                    <text x="180" y={item.y + 5} textAnchor="middle">{item.number}</text>
                    <text className="obstacle-name" x="220" y={item.y + 5}>{positionName(item.id)}</text>
                  </g>
                ))}
              </svg>
            </figure>
            <button
              type="button"
              className={`hurdle-independent ${position === "position-independent" ? "selected" : ""}`}
              aria-pressed={position === "position-independent"}
              onClick={() => setPosition("position-independent")}
            >Positionsunabhängiger Fehler</button>
          </div>

          <div>
            <p className="label">2. Fehler an „{positionName(position)}“ auswählen</p>
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
