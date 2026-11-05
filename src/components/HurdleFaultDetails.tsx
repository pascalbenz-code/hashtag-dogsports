import { useState } from "react";
import { ListPlus, Trash2 } from "lucide-react";
import {
  formatHurdleFaultDetail,
  HURDLE_POSITIONS,
  hurdleFaultsTotal,
  hurdleRulesForPosition,
} from "../domain/hurdleFaults";
import type {
  HurdleFaultDetail,
  HurdleFaultPosition,
} from "../domain/types";
import { Button } from "./ui/button";

interface DiagramPosition {
  id: Exclude<HurdleFaultPosition, "position-independent">;
  x: number;
  y: number;
  shortLabel: string;
}

interface HurdleDiagram {
  route: string;
  positions: readonly DiagramPosition[];
  hurdleCount: number;
}

interface ReferencePosition extends DiagramPosition {
  width: number;
  height: number;
}

const FOUR_HURDLE_REFERENCE_POSITIONS: readonly ReferencePosition[] = [
  { id: "hurdle-1", x: 435, y: 692, width: 250, height: 108, shortLabel: "1" },
  { id: "hurdle-2", x: 624, y: 428, width: 246, height: 108, shortLabel: "2" },
  { id: "turn-pole", x: 963, y: 96, width: 96, height: 180, shortLabel: "W" },
  { id: "hurdle-3", x: 916, y: 428, width: 246, height: 108, shortLabel: "3" },
  { id: "hurdle-4", x: 730, y: 692, width: 252, height: 108, shortLabel: "4" },
];

const FOUR_HURDLE_REFERENCE_IMAGE = `${import.meta.env.BASE_URL}hurdle-course-vk1-vk2-dk.svg`;

const SIX_HURDLE_DIAGRAM: HurdleDiagram = {
  route:
    "M28 310 L85 264 L138 202 L198 135 Q226 92 250 58 Q283 91 310 135 L252 202 L194 264 L154 310",
  hurdleCount: 6,
  positions: [
    { id: "hurdle-1", x: 85, y: 264, shortLabel: "1" },
    { id: "hurdle-2", x: 138, y: 202, shortLabel: "2" },
    { id: "hurdle-3", x: 198, y: 135, shortLabel: "3" },
    { id: "turn-pole", x: 250, y: 58, shortLabel: "W" },
    { id: "hurdle-4", x: 310, y: 135, shortLabel: "4" },
    { id: "hurdle-5", x: 252, y: 202, shortLabel: "5" },
    { id: "hurdle-6", x: 194, y: 264, shortLabel: "6" },
  ],
};

const positionName = (position: HurdleFaultPosition) =>
  HURDLE_POSITIONS.find(({ id }) => id === position)?.label ?? position;

export function HurdleFaultDetails({
  className,
  details,
  onChange,
}: {
  className: "FCI-VK1" | "FCI-VK2" | "FCI-VK3";
  details: HurdleFaultDetail[];
  onChange: (details: HurdleFaultDetail[]) => void;
}) {
  const [expanded, setExpanded] = useState(details.length > 0);
  const isFourHurdleReference = className !== "FCI-VK3";
  const [position, setPosition] = useState<HurdleFaultPosition | null>(
    isFourHurdleReference ? null : "hurdle-1",
  );
  const rules = position ? hurdleRulesForPosition(position) : [];
  const faultedPositions = new Set(details.map((detail) => detail.position));

  const selectFromKeyboard = (
    event: React.KeyboardEvent<SVGGElement>,
    next: HurdleFaultPosition,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPosition(next);
    }
  };

  const add = (code: (typeof rules)[number]["code"]) => {
    if (!position) return;
    const rule = rules.find((candidate) => candidate.code === code);
    if (!rule) return;
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
    <section className="hurdle-details" aria-label="Hürdenfehler im Detail">
      <button
        type="button"
        className="hurdle-details-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span>
          <ListPlus aria-hidden="true" />
          Optionale Detailangaben zu Hürdenfehlern
        </span>
        <strong>
          {details.length
            ? `${details.length} Einträge · ${hurdleFaultsTotal(details)} FP`
            : "Keine Details"}
        </strong>
      </button>

      {expanded ? (
        <div className="hurdle-details-content">
          <div>
            <p className="label">1. Fehlerposition im Schaubild auswählen</p>
            {isFourHurdleReference ? (
              <figure className="hurdle-course hurdle-reference-course">
                <figcaption>
                  Gültig für VDH-VK1, VDH-VK2 und VDH-DK
                </figcaption>
                <div className="hurdle-reference-stage">
                  <img
                    src={FOUR_HURDLE_REFERENCE_IMAGE}
                    width="1458"
                    height="1086"
                    alt="Hürdenlauf mit vier nummerierten Hürden, Wendestange, Start und Ziel"
                  />
                  <svg
                    viewBox="0 0 1458 1086"
                    role="group"
                    aria-label="Fehlerposition auf dem Hürdenlauf-Schaubild auswählen"
                  >
                    {FOUR_HURDLE_REFERENCE_POSITIONS.map((item) => {
                      const hasFault = faultedPositions.has(item.id);
                      const left = item.x - item.width / 2;
                      const top = item.y - item.height / 2;
                      const touchWidth = Math.max(item.width, 260);
                      const touchHeight = Math.max(item.height, 230);
                      return (
                        <g
                          className={`hurdle-reference-hotspot ${position === item.id ? "selected" : ""} ${hasFault ? "has-fault" : ""}`}
                          data-position={item.id}
                          data-faulted={hasFault ? "true" : "false"}
                          role="button"
                          tabIndex={0}
                          aria-label={`${positionName(item.id)} auswählen${hasFault ? ", Fehler erfasst" : ""}`}
                          aria-pressed={position === item.id}
                          onClick={() => setPosition(item.id)}
                          onKeyDown={(event) => selectFromKeyboard(event, item.id)}
                          key={item.id}
                        >
                          <rect
                            className="hurdle-reference-touch-target"
                            x={item.x - touchWidth / 2}
                            y={item.y - touchHeight / 2}
                            width={touchWidth}
                            height={touchHeight}
                            rx="28"
                          />
                          <rect
                            className="hurdle-reference-hit-area"
                            x={left}
                            y={top}
                            width={item.width}
                            height={item.height}
                            rx="18"
                          />
                          {hasFault ? (
                            <g
                              className="hurdle-reference-fault-badge"
                              aria-hidden="true"
                              transform={`translate(${left + item.width - 9} ${top + 9})`}
                            >
                              <circle r="28" />
                              <text y="10" textAnchor="middle">!</text>
                            </g>
                          ) : null}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </figure>
            ) : (
              <figure className="hurdle-course">
                <figcaption>
                  Schaubild H-{className.replace("FCI-", "")} · schematische
                  Darstellung
                </figcaption>
                <svg
                  viewBox="0 0 360 340"
                  role="group"
                  aria-label={`Hürdenlauf mit ${SIX_HURDLE_DIAGRAM.hurdleCount} Hürden und Wendestange`}
                >
                  <defs>
                    <marker
                      id="hurdle-arrow"
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
                    markerEnd="url(#hurdle-arrow)"
                    d={SIX_HURDLE_DIAGRAM.route}
                  />
                  <text className="hurdle-start-label" x="16" y="330">
                    Start
                  </text>
                  <text className="hurdle-start-label" x="172" y="330">
                    Ziel
                  </text>
                  {SIX_HURDLE_DIAGRAM.positions.map((item) => (
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
                      {item.id === "turn-pole" ? (
                        <path d={`M${item.x} ${item.y + 19} V${item.y - 28}`} />
                      ) : (
                        <path d={`M${item.x - 27} ${item.y} H${item.x + 27}`} />
                      )}
                      <circle cx={item.x} cy={item.y} r="20" />
                      <text x={item.x} y={item.y + 5} textAnchor="middle">
                        {item.shortLabel}
                      </text>
                    </g>
                  ))}
                </svg>
              </figure>
            )}
            <button
              type="button"
              className={`hurdle-independent ${position === "position-independent" ? "selected" : ""} ${faultedPositions.has("position-independent") ? "has-fault" : ""}`}
              aria-pressed={position === "position-independent"}
              onClick={() => setPosition("position-independent")}
            >
              Positionsunabhängiger Fehler
            </button>
          </div>

          <div>
            <p className="label">
              {position
                ? `2. Fehler an „${positionName(position)}“ auswählen`
                : "2. Zuerst eine Fehlerposition auswählen"}
            </p>
            {position ? (
              <div className="hurdle-rule-list">
                {rules.map((rule) => (
                  <button
                    type="button"
                    onClick={() => add(rule.code)}
                    key={rule.code}
                  >
                    <span>
                      <strong>{rule.label}</strong>
                      <small>{rule.explanation}</small>
                    </span>
                    <b>−{rule.points} FP</b>
                  </button>
                ))}
              </div>
            ) : (
              <p className="hurdle-position-help">
                Tippe auf eine Hürde oder die Wendestange in der Grafik.
              </p>
            )}
          </div>

          <div className="hurdle-detail-list" aria-live="polite">
            <p className="label">Erfasste Detailfehler</p>
            {details.length ? (
              <ul>
                {details.map((detail) => (
                  <li key={detail.id}>
                    <span>{formatHurdleFaultDetail(detail)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`${formatHurdleFaultDetail(detail)} entfernen`}
                      onClick={() =>
                        onChange(
                          details.filter((candidate) => candidate.id !== detail.id),
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
