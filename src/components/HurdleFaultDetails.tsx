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

interface ReferencePosition {
  id: Exclude<HurdleFaultPosition, "position-independent">;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HurdleReferenceCourse {
  image: string;
  width: number;
  height: number;
  caption: string;
  alt: string;
  minTouchWidth: number;
  minTouchHeight: number;
  positions: readonly ReferencePosition[];
}

const FOUR_HURDLE_REFERENCE_POSITIONS: readonly ReferencePosition[] = [
  { id: "hurdle-1", x: 435, y: 692, width: 250, height: 108 },
  { id: "hurdle-2", x: 624, y: 428, width: 246, height: 108 },
  { id: "turn-pole", x: 963, y: 96, width: 96, height: 180 },
  { id: "hurdle-3", x: 916, y: 428, width: 246, height: 108 },
  { id: "hurdle-4", x: 730, y: 692, width: 252, height: 108 },
];

const FOUR_HURDLE_REFERENCE_IMAGE = `${import.meta.env.BASE_URL}hurdle-course-vk1-vk2-dk.svg`;

const SIX_HURDLE_REFERENCE_POSITIONS: readonly ReferencePosition[] = [
  { id: "hurdle-1", x: 337, y: 815, width: 185, height: 90 },
  { id: "hurdle-2", x: 499, y: 565, width: 185, height: 90 },
  { id: "hurdle-3", x: 645, y: 375, width: 182, height: 90 },
  { id: "turn-pole", x: 928, y: 89, width: 90, height: 175 },
  { id: "hurdle-4", x: 886, y: 375, width: 186, height: 90 },
  { id: "hurdle-5", x: 746, y: 565, width: 186, height: 90 },
  { id: "hurdle-6", x: 586, y: 815, width: 187, height: 90 },
];

const SIX_HURDLE_REFERENCE_IMAGE = `${import.meta.env.BASE_URL}hurdle-course-vk3-svk.svg`;

const FOUR_HURDLE_REFERENCE: HurdleReferenceCourse = {
  image: FOUR_HURDLE_REFERENCE_IMAGE,
  width: 1458,
  height: 1086,
  caption: "Gültig für VDH-VK1, VDH-VK2 und VDH-DK",
  alt: "Hürdenlauf mit vier nummerierten Hürden, Wendestange, Start und Ziel",
  minTouchWidth: 260,
  minTouchHeight: 230,
  positions: FOUR_HURDLE_REFERENCE_POSITIONS,
};

const SIX_HURDLE_REFERENCE: HurdleReferenceCourse = {
  image: SIX_HURDLE_REFERENCE_IMAGE,
  width: 1309,
  height: 1201,
  caption: "Gültig für VDH-VK3 und VDH-S-VK",
  alt: "Hürdenlauf mit sechs nummerierten Hürden, Wendestange, Start und Ziel",
  minTouchWidth: 220,
  minTouchHeight: 210,
  positions: SIX_HURDLE_REFERENCE_POSITIONS,
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
  const referenceCourse = isFourHurdleReference
    ? FOUR_HURDLE_REFERENCE
    : SIX_HURDLE_REFERENCE;
  const [position, setPosition] = useState<HurdleFaultPosition | null>(null);
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
            <figure className="hurdle-course hurdle-reference-course">
              <figcaption>{referenceCourse.caption}</figcaption>
              <div
                className="hurdle-reference-stage"
                style={{
                  aspectRatio: `${referenceCourse.width} / ${referenceCourse.height}`,
                }}
              >
                <img
                  src={referenceCourse.image}
                  width={referenceCourse.width}
                  height={referenceCourse.height}
                  alt={referenceCourse.alt}
                />
                <svg
                  viewBox={`0 0 ${referenceCourse.width} ${referenceCourse.height}`}
                  role="group"
                  aria-label="Fehlerposition auf dem Hürdenlauf-Schaubild auswählen"
                >
                  {referenceCourse.positions.map((item) => {
                    const hasFault = faultedPositions.has(item.id);
                    const left = item.x - item.width / 2;
                    const top = item.y - item.height / 2;
                    const touchWidth = Math.max(
                      item.width,
                      referenceCourse.minTouchWidth,
                    );
                    const touchHeight = Math.max(
                      item.height,
                      referenceCourse.minTouchHeight,
                    );
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
                        onKeyDown={(event) =>
                          selectFromKeyboard(event, item.id)
                        }
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
