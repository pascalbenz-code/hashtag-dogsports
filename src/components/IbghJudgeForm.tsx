import { useState } from "react";
import {
  getIbghDefinition,
  IBGH3_VARIANTS,
  IBGH_LEVELS,
  type Ibgh3Variant,
  type IbghLevel,
} from "../domain/ibghJudging";
import { DigitalJudgeForm } from "./DigitalJudgeForm";

export function IbghJudgeForm() {
  const [level, setLevel] = useState<IbghLevel>("FCI-IBGH1");
  const [variant, setVariant] = useState<Ibgh3Variant>(1);
  const definition = getIbghDefinition(level, variant);

  const chooseLevel = (nextLevel: IbghLevel) => {
    setLevel(nextLevel);
    if (nextLevel !== "FCI-IBGH3") setVariant(1);
  };

  return (
    <DigitalJudgeForm
      key={level}
      level={level}
      levels={IBGH_LEVELS}
      definition={definition}
      onLevelChange={chooseLevel}
      auxiliaryControl={
        level === "FCI-IBGH3" ? (
          <label className="field">
            <span>Variante</span>
            <select
              value={variant}
              onChange={(event) =>
                setVariant(Number(event.target.value) as Ibgh3Variant)
              }
            >
              {IBGH3_VARIANTS.map((item) => (
                <option value={item} key={item}>
                  Variante {item}
                </option>
              ))}
            </select>
          </label>
        ) : null
      }
      note={
        level === "FCI-IBGH3"
          ? `Variante ${variant} legt die Reihenfolge der acht Unteraufgaben fest.`
          : "Die Detailbewertungspunkte und ihre Höchstfehler werden in einem späteren Ausbauschritt fachlich ergänzt."
      }
    />
  );
}
