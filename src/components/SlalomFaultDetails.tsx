import { useState } from "react";
import { ListPlus, Trash2 } from "lucide-react";
import {
  formatSlalomFaultDetail,
  SLALOM_POSITIONS,
  slalomFaultsTotal,
  slalomRulesForPosition,
} from "../domain/slalomFaults";
import type {
  CompetitionResult,
  SlalomFaultDetail,
  SlalomFaultPosition,
} from "../domain/types";
import { Button } from "./ui/button";

const GATES: ReadonlyArray<{
  id: Exclude<SlalomFaultPosition, "position-independent">;
  x: number;
  y: number;
  postStart: number;
  postEnd: number;
}> = [
  { id: "gate-1", x: 195, y: 382, postStart: 158, postEnd: 232 },
  { id: "gate-2", x: 82, y: 292, postStart: 45, postEnd: 119 },
  { id: "gate-3", x: 195, y: 202, postStart: 158, postEnd: 232 },
  { id: "gate-4", x: 82, y: 112, postStart: 45, postEnd: 119 },
];

const positionName = (position: SlalomFaultPosition) =>
  SLALOM_POSITIONS.find(({ id }) => id === position)?.label ?? position;

export function SlalomFaultDetails({
  className,
  details,
  onChange,
}: {
  className: CompetitionResult["className"];
  details: SlalomFaultDetail[];
  onChange: (details: SlalomFaultDetail[]) => void;
}) {
  const [expanded, setExpanded] = useState(details.length > 0);
  const [position, setPosition] = useState<SlalomFaultPosition>("gate-1");
  const rules = slalomRulesForPosition(position);

  const selectFromKeyboard = (
    event: React.KeyboardEvent<SVGGElement>,
    next: SlalomFaultPosition,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPosition(next);
    }
  };

  const add = (code: (typeof rules)[number]["code"]) => {
    const rule = rules.find((candidate) => candidate.code === code);
    if (!rule) return;
    if (
      code === "gate-omitted" &&
      details.some(
        (detail) => detail.position === position && detail.code === code,
      )
    )
      return;
    onChange([
      ...details,
      {
        id: crypto.randomUUID(),
        position,
        code: rule.code,
        points: rule.points,
      },
    ]);
  };

  return (
    <section className="hurdle-details" aria-label="Slalomfehler im Detail">
      <button
        type="button"
        className="hurdle-details-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span>
          <ListPlus aria-hidden="true" />
          Optionale Detailangaben zu Slalomfehlern
        </span>
        <strong>
          {details.length
            ? `${details.length} Einträge · ${slalomFaultsTotal(details)} FP`
            : "Keine Details"}
        </strong>
      </button>

      {expanded ? (
        <div className="hurdle-details-content">
          <p className="slalom-rule-note">
            Die Laufzeit wird mit −1 Punkt je Sekunde berücksichtigt. Eine
            korrekte Torpassage verursacht keinen Fehlerabzug; Hund und
            Hundeführer müssen das Tor in Laufrichtung durchlaufen.
          </p>
          <div>
            <p className="label">1. Fehlerposition im Schaubild auswählen</p>
            <figure className="hurdle-course slalom-course">
              <figcaption>
                Schaubild S-{className.replace("FCI-", "")} · schematische
                Darstellung
              </figcaption>
              <svg
                viewBox="0 0 280 500"
                role="group"
                aria-label="Slalomlauf mit vier Streckentoren, Start und Ziel"
              >
                <defs>
                  <marker
                    id="slalom-arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L0,6 L7,3 z" />
                  </marker>
                </defs>
                <path
                  className="hurdle-route"
                  markerEnd="url(#slalom-arrow)"
                  d="M105 463 C135 435 182 414 195 382 S120 315 82 292 S155 225 195 202 S120 135 82 112 S132 62 168 38"
                />
                <path className="slalom-boundary" d="M38 28 V470 M240 28 V470" />
                <text className="hurdle-start-label" x="70" y="488">Start</text>
                <text className="hurdle-start-label" x="166" y="22">Ziel</text>
                {GATES.map((item, index) => (
                  <g
                    className={`hurdle-position ${position === item.id ? "selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${positionName(item.id)} auswählen`}
                    aria-pressed={position === item.id}
                    onClick={() => setPosition(item.id)}
                    onKeyDown={(event) => selectFromKeyboard(event, item.id)}
                    key={item.id}
                  >
                    <path d={`M${item.postStart} ${item.y} H${item.postEnd}`} />
                    <circle cx={item.x} cy={item.y} r="23" />
                    <text x={item.x} y={item.y + 5} textAnchor="middle">
                      {index + 1}
                    </text>
                  </g>
                ))}
              </svg>
            </figure>
            <button
              type="button"
              className={`hurdle-independent ${position === "position-independent" ? "selected" : ""}`}
              aria-pressed={position === "position-independent"}
              onClick={() => setPosition("position-independent")}
            >
              Positionsunabhängiger Fehler
            </button>
          </div>

          <div>
            <p className="label">
              2. Fehler an „{positionName(position)}“ auswählen
            </p>
            <div className="hurdle-rule-list">
              {rules.map((rule) => {
                const alreadyAdded =
                  rule.code === "gate-omitted" &&
                  details.some(
                    (detail) =>
                      detail.position === position && detail.code === rule.code,
                  );
                return (
                  <button
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => add(rule.code)}
                    key={rule.code}
                  >
                    <span>
                      <strong>{rule.label}</strong>
                      <small>
                        {alreadyAdded ? "Für dieses Tor bereits erfasst." : rule.explanation}
                      </small>
                    </span>
                    <b>−{rule.points} FP</b>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hurdle-detail-list" aria-live="polite">
            <p className="label">Erfasste Detailfehler</p>
            {details.length ? (
              <ul>
                {details.map((detail) => (
                  <li key={detail.id}>
                    <span>{formatSlalomFaultDetail(detail)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`${formatSlalomFaultDetail(detail)} entfernen`}
                      onClick={() =>
                        onChange(
                          details.filter(
                            (candidate) => candidate.id !== detail.id,
                          ),
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Noch keine Detailfehler erfasst. Die direkte Eingabe der
                Fehlerpunkte bleibt möglich.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
