# THS-Aufstiegs- und Qualifikationsbedingungen pflegen

Die App importiert die folgenden TypeScript-Dateien direkt aus `src/domain/thsRules/`:

| Datei | Inhalt |
| --- | --- |
| `Aufstiegsbedingungen_VK.ts` | Aufstieg von VK1 nach VK2 und VK2 nach VK3 |
| `Quali-swhv_VK_S-VK.ts` | swhv-Verbandsmeisterschaft, VK3 und Sprintvierkampf |
| `Quali-dhv_VK_S-VK.ts` | dhv Deutsche Meisterschaft, VK3 und Sprintvierkampf |
| `Quali-vdh_VK_S-VK.ts` | VDH Deutsche Meisterschaft, VK3 und Sprintvierkampf |

## Felder

- `flag.label`: Grundbezeichnung des Flags. Bei Meisterschaften wird ausschließlich der Jahresflag-Text aus `periods[].label` angezeigt.
- `flag.color`: `gray`, `green`, `blue` oder `red`; die Darstellung nutzt die vorhandenen Theme-Farben (`q-*` in `src/index.css`).
- `flag.key`: stabile technische ID für Filter, Freigaben und Rückmeldungen. Bei Text-/Farbänderungen beibehalten.
- `conditions`: alternative Bedingungen für das Flag. Innerhalb einer Bedingung müssen alle Anforderungen erfüllt sein.
- `className`: technische Disziplin-ID. `FCI-VK1/2/3` heißen in der Oberfläche VDH-VK1/2/3; IDs beibehalten.
- `competitionTypes`: zulässige Veranstaltungsarten; vollständig pro Bedingung aufgeführt.
- `minObedience`: inklusive Mindestpunktzahl der Unterordnung, sofern erforderlich.
- `minTotal`: inklusive Mindestgesamtpunktzahl. Beim Sprintvierkampf eine Tabelle nach Geschlecht (`male`, `female`) und Altersklasse (`youngest` bis 14, `youth` 15–18, `active` 19–49, `senior` ab 50). Alter am Veranstaltungsdatum.
- `includes`: zusätzlich erfüllte Leistungsvoraussetzungen. Bei dhv ist derzeit swhv eingeschlossen, auch wenn die eigene swhv-Leistungsbedingung nicht erfüllt ist. Der SWHV-Zeitraum wird anschließend separat geprüft.
- `periods`: Qualifikationszeiträume pro Meisterschaft. Jeder Eintrag enthält `year`, `startDate`, `endDate` und den sichtbaren Text `label`. Datumsformat: `JJJJ-MM-TT`. Beide Grenzen sind eingeschlossen; maßgeblich ist das Veranstaltungsdatum, unabhängig vom heutigen Datum oder Speicherzeitpunkt. Ohne passenden Zeitraum kein Meisterschaftsflag. Ohne `periods` (Aufstieg) bleibt die Vergabe zeitunabhängig.

## Meisterschaftsjahre

| Meisterschaft | Jahr | Zeitraum / Veranstaltung | Flag | Farbe |
| --- | --- | --- | --- | --- |
| SWHV | 2025 | 01.07.2024–30.05.2025 | SWHV-QUALI-25 | Grün |
| SWHV | 2026 | 01.07.2025–30.05.2026 | SWHV-QUALI-26 | Grün |
| SWHV | 2027 | 01.07.2026–10.05.2027 | SWHV-QUALI-27 | Grün |
| DHV | 2025 | Verbandsmeisterschaft im Kalenderjahr 2025 | DHV-QUALI-25 | Blau |
| DHV | 2026 | Verbandsmeisterschaft im Kalenderjahr 2026 | DHV-QUALI-26 | Blau |
| DHV | 2027 | Verbandsmeisterschaft im Kalenderjahr 2027 | DHV-QUALI-27 | Blau |
| VDH | 2025 | 08.09.2024–06.09.2025 | VDH-QUALI-25 | Rot |
| VDH | 2026 | 08.09.2025–06.09.2026 | VDH-QUALI-26 | Rot |
| VDH | 2027 | 08.09.2026–06.09.2027 | VDH-QUALI-27 | Rot |

Diese Zeiträume gelten zusätzlich zu den Leistungs- und Veranstaltungsbedingungen für VK3 und Sprintvierkampf. Bei DHV wird das Kalenderjahr als 01.01.–31.12. konfiguriert; die Leistungsbedingung erfordert weiterhin eine Verbandsmeisterschaft. Es erscheint ausschließlich das Jahresflag, kein zusätzliches allgemeines Meisterschaftsflag. Das Jahr ist ein eigenes Auswertungsmerkmal; die technischen Kennungen `swhv`, `dhv`, `vdh` bleiben für bestehende Filter erhalten. Verschiedene Meisterschaften können beim selben Ergebnis unterschiedliche Jahreszahlen tragen. Erfolgsrückmeldungen unterscheiden Kennung und Jahr.

Beispiel: Eine hinreichende Leistung bei einer Verbandsmeisterschaft am 01.08.2026 kann SWHV-QUALI-27, DHV-QUALI-26 und VDH-QUALI-26 ergeben. Am 15.06.2026 entfällt trotz kumulativer Leistungsvoraussetzung das SWHV-Flag, da kein SWHV-Zeitraum passt.

Eine Sprintgrenze für aktive Männer wird im Eintrag `className: "VDH-S-VK"` unter `minTotal.male.active` geändert. Der unverändert übernommene VDH-Wert beträgt 270. Die beispielhafte fachliche Änderung wurde nicht umgesetzt.

Weitere Bedingungen für vorhandene Flags können in der jeweiligen Datei ergänzt werden. Neue technische Flag-IDs oder Disziplinen erfordern zusätzlich passende Typen und UI-Unterstützung. `index.ts` registriert die Dateien und bestimmt die Anzeigereihenfolge; `types.ts` prüft die Struktur beim Build.

## Anwendung und Prüfung

Keine zusätzliche Übertragung in Berechnungs- oder UI-Code nötig: `calculateScore` liest Bedingungen und Flags aus diesen Dateien. Vorschau, Ergebnisliste, Qualifikationsfilter, Dashboard und Erfolgsrückmeldungen nutzen diese zentrale Auswertung. Nur vollständige Ergebnisse werden bewertet. Bereits gespeicherte Ergebnisse erhalten beim Laden in der aktualisierten App automatisch die nach den aktuellen Zeiträumen berechneten Jahresflags. Erneutes Speichern oder eine Datenmigration ist dafür nicht erforderlich; IDs, Zeitstempel, Leistungsdaten und Sync-Queue bleiben erhalten. Ergebnisse werden bei erneuter Auswertung anhand der aktuellen Regeln bewertet; es gibt keine historische Regelversionierung. Bereits veröffentlichte Vereinszusammenfassungen sind gespeicherte Momentaufnahmen und werden nicht automatisch neu veröffentlicht.

Nach einer Änderung `npm test`, `npm run lint` und `npm run build` ausführen. Die unabhängigen Referenzwerte in `src/domain/thsRules.test.ts` schützen das bisherige Verhalten und müssen bei einer bestätigten fachlichen Regeländerung ebenfalls gezielt angepasst werden.

Lokal greift Vite die Dateiänderung auf. Für die veröffentlichte App ist anschließend ein neuer Build und ein Deployment erforderlich; installierte PWAs müssen die aktualisierte App-Version laden. Es handelt sich um versionierte App-Konfiguration, nicht um eine serverseitige Live-Konfiguration.

Die Leistungsgrenzen stammen aus der bisherigen Implementierung. Die Meisterschaftszeiträume 2025–2027 und die Anzeige ausschließlich als Jahresflag wurden am 14.11.2026 vom Auftraggeber vorgegeben. Weitere fachliche Änderungen anhand bestätigter Quellen prüfen; siehe `BUSINESS_RULES.md`.
