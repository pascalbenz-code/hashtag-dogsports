import { useId, useState, type ReactNode } from "react";
import { Info, RotateCcw, Scale, X } from "lucide-react";
import {
  calculateJudgingScore,
  type JudgingFaults,
  type JudgingLevelDefinition,
  type PerformanceRating,
} from "../domain/judging";
import { LocaleNumberInput } from "./LocaleNumberInput";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const points = (value: number) =>
  value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const ratingClasses: Record<PerformanceRating, string> = {
  Vorzüglich: "excellent",
  "Sehr Gut": "very-good",
  Gut: "good",
  Befriedigend: "satisfactory",
  Mangelhaft: "deficient",
};

function RatingBadge({ rating }: { rating: PerformanceRating }) {
  return (
    <span className={`judge-rating ${ratingClasses[rating]}`}>{rating}</span>
  );
}

function CriterionInfo({
  criterion,
  exerciseLabel,
}: {
  criterion: JudgingLevelDefinition["exercises"][number]["criteria"][number];
  exerciseLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const infoId = useId();

  return (
    <>
      <button
        type="button"
        className="judge-info-button"
        aria-label={`Bewertungshinweise für ${exerciseLabel}: ${criterion.label}`}
        aria-expanded={open}
        aria-controls={infoId}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X aria-hidden="true" /> : <Info aria-hidden="true" />}
      </button>
      {open ? (
        <div className="judge-info-box" id={infoId} role="note">
          <strong>{criterion.label}</strong>
          {criterion.element || criterion.rule ? (
            <div className="judge-info-meta">
              {criterion.element ? <span>{criterion.element}</span> : null}
              {criterion.rule ? <span>{criterion.rule}</span> : null}
            </div>
          ) : null}
          <p>{criterion.description}</p>
        </div>
      ) : null}
    </>
  );
}

export function DigitalJudgeForm<TLevel extends string>({
  level,
  levels,
  definition,
  onLevelChange,
  auxiliaryControl,
  note,
}: {
  level: TLevel;
  levels: readonly TLevel[];
  definition: JudgingLevelDefinition<TLevel>;
  onLevelChange: (level: TLevel) => void;
  auxiliaryControl?: ReactNode;
  note: string;
}) {
  const [faults, setFaults] = useState<JudgingFaults>({});
  const [revision, setRevision] = useState(0);
  const score = calculateJudgingScore(definition, faults);
  const exerciseScores = new Map(
    score.exercises.map((exercise) => [exercise.exerciseId, exercise]),
  );

  const reset = () => {
    setFaults({});
    setRevision((current) => current + 1);
  };

  return (
    <div className="space-y-5">
      <Card className="judge-summary">
        <div>
          <p className="eyebrow text-teal">DIGITALER LEISTUNGSRICHTER</p>
          <h2>Unterordnung {level}</h2>
          <p className="mt-2 text-sm text-muted">
            Fehlerpunkte werden direkt von der jeweiligen Unteraufgabe
            abgezogen.
          </p>
        </div>
        <div className="judge-total" aria-live="polite">
          <Scale aria-hidden="true" />
          <strong>{points(score.total)}</strong>
          <span>von {points(definition.maxPoints)} Punkten</span>
          <RatingBadge rating={score.rating} />
        </div>
      </Card>

      <Card>
        <fieldset>
          <legend className="label">Prüfungsstufe</legend>
          <div className="judge-levels">
            {levels.map((item) => (
              <button
                type="button"
                className={item === level ? "active" : ""}
                aria-pressed={item === level}
                onClick={() => onLevelChange(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>
        {auxiliaryControl}
        <p className="mt-3 text-xs text-muted">{note}</p>
      </Card>

      {definition.exercises.map((exercise, exerciseIndex) => {
        const exerciseScore = exerciseScores.get(exercise.id)!;
        return (
          <Card className="judge-exercise" key={exercise.id}>
            <div className="judge-exercise-heading">
              <div>
                <span>Unteraufgabe {exerciseIndex + 1}</span>
                <h3>{exercise.label}</h3>
              </div>
              <div className="judge-exercise-score">
                <strong>{points(exerciseScore.points)}</strong>
                <span>/ {points(exercise.maxPoints)}</span>
                <RatingBadge rating={exerciseScore.rating} />
              </div>
            </div>

            <div className="judge-criteria">
              {exercise.criteria.map((criterion) => {
                const inputId = `fault-${criterion.id}`;
                return (
                  <div className="judge-criterion" key={criterion.id}>
                    <div className="judge-criterion-copy">
                      <label htmlFor={inputId}>{criterion.label}</label>
                      {criterion.element || criterion.rule ? (
                        <small>
                          {[criterion.element, criterion.rule]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      ) : null}
                      <CriterionInfo
                        criterion={criterion}
                        exerciseLabel={exercise.label}
                      />
                    </div>
                    <div className="judge-fault-input">
                      <LocaleNumberInput
                        key={`${revision}-${level}-${criterion.id}`}
                        id={inputId}
                        value={faults[criterion.id] ?? null}
                        max={criterion.maxFaults ?? exercise.maxPoints}
                        maxFractionDigits={1}
                        placeholder="0,0"
                        ariaLabel={`Fehlerpunkte ${exercise.label} ${criterion.label}`}
                        onValueChange={(value) =>
                          setFaults((current) => ({
                            ...current,
                            [criterion.id]: value,
                          }))
                        }
                      />
                      <span>FP</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="judge-exercise-footer">
              <span>Fehlerpunkte</span>
              <strong>− {points(exerciseScore.deductions)}</strong>
            </div>
          </Card>
        );
      })}

      {score.errors.length ? (
        <Card>
          <ul className="errors text-ink">
            {score.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Button type="button" variant="ghost" className="w-full" onClick={reset}>
        <RotateCcw />
        Bewertung zurücksetzen
      </Button>
    </div>
  );
}
