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
      note="Qualitative Fehlerpunkte werden manuell erfasst. Feste Abzüge, Nullbewertungen und mangelhafte Teilbewertungen werden über die gekennzeichneten Regeln aktiviert."
    />
  );
}
