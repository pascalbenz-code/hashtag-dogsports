# THS-Aufstiegs- und Qualifikationsbedingungen pflegen

Die App importiert die folgenden TypeScript-Dateien direkt aus `src/domain/thsRules/`:

| Datei | Inhalt |
| --- | --- |
| `Aufstiegsbedingungen_VK.ts` | Aufstieg von VK1 nach VK2 und VK2 nach VK3 |
| `Quali-swhv_VK_S-VK.ts` | swhv-Verbandsmeisterschaft, VK3 und Sprintvierkampf |
| `Quali-dhv_VK_S-VK.ts` | dhv Deutsche Meisterschaft, VK3 und Sprintvierkampf |
| `Quali-vdh_VK_S-VK.ts` | VDH Deutsche Meisterschaft, VK3 und Sprintvierkampf |

## Felder

- `flag.label`: sichtbarer Text des erreichten Flags in Ergebnissen und Erfolgsrückmeldungen.
- `flag.color`: `gray`, `green`, `blue` oder `red`; die Darstellung nutzt die vorhandenen Theme-Farben (`q-*` in `src/index.css`).
- `flag.key`: stabile technische ID für Filter, Freigaben und Rückmeldungen. Bei Text-/Farbänderungen beibehalten.
- `conditions`: alternative Bedingungen für das Flag. Innerhalb einer Bedingung müssen alle Anforderungen erfüllt sein.
- `className`: technische Disziplin-ID. `FCI-VK1/2/3` heißen in der Oberfläche VDH-VK1/2/3; IDs beibehalten.
- `competitionTypes`: zulässige Veranstaltungsarten; vollständig pro Bedingung aufgeführt.
- `minObedience`: inklusive Mindestpunktzahl der Unterordnung, sofern erforderlich.
- `minTotal`: inklusive Mindestgesamtpunktzahl. Beim Sprintvierkampf eine Tabelle nach Geschlecht (`male`, `female`) und Altersklasse (`youngest` bis 14, `youth` 15–18, `active` 19–49, `senior` ab 50). Alter am Veranstaltungsdatum.
- `includes`: zusätzlich vergebene Flags. Bei dhv ist derzeit swhv eingeschlossen, auch wenn die eigene swhv-Bedingung nicht erfüllt ist.

Eine Sprintgrenze für aktive Männer wird im Eintrag `className: "VDH-S-VK"` unter `minTotal.male.active` geändert. Der unverändert übernommene VDH-Wert beträgt 270. Die beispielhafte fachliche Änderung wurde nicht umgesetzt.

Weitere Bedingungen für vorhandene Flags können in der jeweiligen Datei ergänzt werden. Neue technische Flag-IDs oder Disziplinen erfordern zusätzlich passende Typen und UI-Unterstützung. `index.ts` registriert die Dateien und bestimmt die Anzeigereihenfolge; `types.ts` prüft die Struktur beim Build.

## Anwendung und Prüfung

Keine zusätzliche Übertragung in Berechnungs- oder UI-Code nötig: `calculateScore` liest Bedingungen und Flags aus diesen Dateien. Vorschau, Ergebnisliste, Qualifikationsfilter, Dashboard und Erfolgsrückmeldungen nutzen diese zentrale Auswertung. Nur vollständige Ergebnisse werden bewertet. Ergebnisse werden bei erneuter Auswertung anhand der aktuellen Regeln bewertet; es gibt keine historische Regelversionierung. Bereits veröffentlichte Vereinszusammenfassungen sind gespeicherte Momentaufnahmen und werden nicht automatisch neu veröffentlicht.

Nach einer Änderung `npm test`, `npm run lint` und `npm run build` ausführen. Die unabhängigen Referenzwerte in `src/domain/thsRules.test.ts` schützen das bisherige Verhalten und müssen bei einer bestätigten fachlichen Regeländerung ebenfalls gezielt angepasst werden.

Lokal greift Vite die Dateiänderung auf. Für die veröffentlichte App ist anschließend ein neuer Build und ein Deployment erforderlich; installierte PWAs müssen die aktualisierte App-Version laden. Es handelt sich um versionierte App-Konfiguration, nicht um eine serverseitige Live-Konfiguration.

Die Auslagerung übernimmt ausschließlich bestehende Implementierungswerte. Fachliche Änderungen weiterhin anhand bestätigter Quellen prüfen; siehe `BUSINESS_RULES.md`.
