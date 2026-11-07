import { useState } from "react";
import {
  JUDGING_DEFINITIONS,
  JUDGING_LEVELS,
  type JudgingLevel,
} from "../domain/judging";
import { DigitalJudgeForm } from "./DigitalJudgeForm";

export function JudgeForm() {
  const [level, setLevel] = useState<JudgingLevel>("VDH-VK1");
  return (
    <DigitalJudgeForm
      key={level}
      level={level}
      levels={JUDGING_LEVELS}
      definition={JUDGING_DEFINITIONS[level]}
      onLevelChange={setLevel}
      note="Qualitative Fehlerpunkte werden manuell erfasst. Feste Abzüge und Nullbewertungen werden über die gekennzeichneten Regeln aktiviert; mangelhafte Teilbewertungen ziehen abhängig von der Unteraufgabe direkt 3,5 oder 5,0 Punkte ab."
    />
  );
}
