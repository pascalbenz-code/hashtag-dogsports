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

interface SlalomReferencePosition {
  id: Exclude<SlalomFaultPosition, "position-independent">;
  x: number;
  y: number;
  width: number;
  height: number;
}

const SLALOM_REFERENCE_POSITIONS: readonly SlalomReferencePosition[] = [
  { id: "gate-1", x: 427, y: 1037, width: 125, height: 135 },
  { id: "gate-2", x: 592, y: 830, width: 132, height: 137 },
  { id: "gate-3", x: 428, y: 633, width: 125, height: 140 },
  { id: "gate-4", x: 591, y: 435, width: 132, height: 143 },
  { id: "gate-5", x: 427, y: 244, width: 125, height: 142 },
];

const SLALOM_REFERENCE_IMAGE = `${import.meta.env.BASE_URL}slalom-course-vk-dk.svg`;

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
  const [position, setPosition] = useState<SlalomFaultPosition | null>(null);
  const rules = position ? slalomRulesForPosition(position) : [];
  const faultedPositions = new Set(details.map((detail) => detail.position));

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
    if (!position) return;
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
            <figure
              className="hurdle-course slalom-course slalom-reference-course"
              data-class-name={className}
            >
              <figcaption>
                Gültig für VDH-VK1, VDH-VK2, VDH-VK3, VDH-S-VK und VDH-DK
              </figcaption>
              <div className="slalom-reference-stage">
                <img
                  src={SLALOM_REFERENCE_IMAGE}
                  width="1024"
                  height="1536"
                  alt="Slalomlauf mit fünf nummerierten Slalomtoren, Start und Ziel"
                />
                <svg
                  viewBox="0 0 1024 1536"
                  role="group"
                  aria-label="Fehlerposition auf dem Slalomlauf-Schaubild auswählen"
                >
                  {SLALOM_REFERENCE_POSITIONS.map((item) => {
                    const hasFault = faultedPositions.has(item.id);
                    const left = item.x - item.width / 2;
                    const top = item.y - item.height / 2;
                    return (
                      <g
                        className={`slalom-reference-hotspot ${position === item.id ? "selected" : ""} ${hasFault ? "has-fault" : ""}`}
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
                          className="slalom-reference-touch-target"
                          x={item.x - 95}
                          y={item.y - 85}
                          width="190"
                          height="170"
                          rx="28"
                        />
                        <rect
                          className="slalom-reference-hit-area"
                          x={left}
                          y={top}
                          width={item.width}
                          height={item.height}
                          rx="18"
                        />
                        {hasFault ? (
                          <g
                            className="slalom-reference-fault-badge"
                            aria-hidden="true"
                            transform={`translate(${left + item.width - 5} ${top + 7})`}
                          >
                            <circle r="30" />
                            <text y="11" textAnchor="middle">!</text>
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
            >
              Positionsunabhängiger Fehler
            </button>
          </div>

          <div>
            <p className="label">
              {position
                ? `2. Fehler an „${positionName(position)}“ auswählen`
                : "2. Zuerst ein Slalomtor auswählen"}
            </p>
            {position ? (
              <div className="hurdle-rule-list">
                {rules.map((rule) => {
                  const alreadyAdded =
                    rule.code === "gate-omitted" &&
                    details.some(
                      (detail) =>
                        detail.position === position &&
                        detail.code === rule.code,
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
                          {alreadyAdded
                            ? "Für dieses Tor bereits erfasst."
                            : rule.explanation}
                        </small>
                      </span>
                      <b>−{rule.points} FP</b>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="hurdle-position-help">
                Tippe auf eines der fünf nummerierten Tore in der Grafik.
              </p>
            )}
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
