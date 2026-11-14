import { PROMOTION_RULES } from "./Aufstiegsbedingungen_VK";
import { SWHV_RULE } from "./Quali-swhv_VK_S-VK";
import { DHV_RULE } from "./Quali-dhv_VK_S-VK";
import { VDH_RULE } from "./Quali-vdh_VK_S-VK";
import type { QualificationDefinition } from "./types";

// Reihenfolge der Flags in Ergebnisansichten und Rückmeldungen.
export const THS_QUALIFICATION_RULES: readonly QualificationDefinition[] = [
  ...PROMOTION_RULES, SWHV_RULE, DHV_RULE, VDH_RULE,
];
