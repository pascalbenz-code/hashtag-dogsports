import type { ResultFormStep } from "../domain/resultForm";

const steps: ReadonlyArray<{ step: ResultFormStep; label: string }> = [
  { step: 1, label: "Zuordnung" },
  { step: 2, label: "Prüfungsdaten" },
  { step: 3, label: "Leistungsdaten" },
];

export function ResultEntryProgress({
  step,
  onStepChange,
}: {
  step: ResultFormStep;
  onStepChange: (step: ResultFormStep) => void;
}) {
  return (
    <nav
      className="result-entry-progress"
      aria-label="Fortschritt Ergebniserfassung"
    >
      <ol>
        {steps.map((item, index) => {
          const active = item.step === step;
          const completed = item.step < step;
          return (
            <li
              className={
                active ? "active" : completed ? "completed" : "pending"
              }
              key={item.step}
            >
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                aria-label={`Schritt ${item.step} von ${steps.length}: ${item.label}`}
                onClick={() => onStepChange(item.step)}
              >
                <span className="result-entry-step-number" aria-hidden="true">
                  {item.step}
                </span>
                <span className="result-entry-step-label">{item.label}</span>
              </button>
              {index < steps.length - 1 ? (
                <span className="result-entry-step-connector" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
