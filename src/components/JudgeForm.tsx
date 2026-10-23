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
      note="Die Detailbewertungspunkte und ihre Höchstfehler werden im nächsten Ausbauschritt fachlich vervollständigt."
    />
  );
}
