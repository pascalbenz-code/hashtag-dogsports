# Fachregeln

Diese Datei beschreibt den implementierten Code, nicht automatisch die aktuelle Sportordnung. Fachliche Primärdokumente sind nicht im Repository versioniert; siehe „Quellenstatus“.

## Ergebnisstatus und Validierung

`src/domain/scoring.ts` ist die maßgebliche Implementierung. Vor jeder Berechnung wird Vollständigkeit geprüft. Bei Fehlern gilt: `complete=false`, `total=null`, keine Qualifikationen. Fehlende Werte werden niemals als null Fehler oder `0` interpretiert. Ein unvollständiger Datensatz darf nur als Entwurf gespeichert werden.

Allgemein erforderlich: Datum, Veranstaltung, existierende Hundeführer-/Hundzuordnung und Namen. Zeiten und Fehler müssen endlich und nicht negativ sein. Wenn Detailfehler vorhanden sind, müssen sie gültig sein und ihre Summe exakt dem Fehlerfeld entsprechen.

| Disziplin | Zusätzliche Pflichtdaten |
| --- | --- |
| VDH-VK1/2/3 | Unterordnung 0–60; Hürde, Slalom und Hindernis vollständig |
| VDH-DK | drei Laufdisziplinen und deren Leinenstatus |
| VDH-S-VK | drei Laufdisziplinen; 1000-m-Zeit ≥ 0, Strecke > 0; Geburtsdatum und Geschlecht des Hundeführers |
| VDH-HL | zwei Hindernisläufe und Leinenstatus beider Läufe |

## THS-Berechnungen

Alle Ergebnisse werden auf zwei Nachkommastellen gerundet.

| Disziplin | Implementierte Formel |
| --- | --- |
| VDH-VK1 | `250 + Unterordnung − Σ(Laufzeit + Fehler)` |
| VDH-VK2 | `255 + Unterordnung − Σ(Laufzeit + Fehler)` |
| VDH-VK3 | `265 + Unterordnung − Σ(Laufzeit + Fehler)` |
| VDH-DK | `240 + 5 je Laufdisziplin ohne Leine − Σ(Laufzeit + Fehler)` |
| VDH-HL | Summe beider `(Zeit + Fehler + 5 Sekunden bei Leine)`; niedriger ist besser |
| VDH-S-VK | `340 − 10 bei Frühstart − Σ(Laufzeit + Fehler) − normierte 1000-m-Zeit` |

Normierte 1000-m-Zeit: `(Sekunden × 1000) / Streckenmeter / 10`. Die Strecke muss positiv sein.

Altersklasse am Veranstaltungsdatum: bis einschließlich 14 Jüngstenklasse, 15–18 Jugendklasse, 19–49 Aktivenklasse, ab 50 Seniorenklasse.

## Qualifikationen und Aufstiege

Qualifikationen werden nur für vollständige Ergebnisse vergeben und können kumulativ sein. Bedingungen und Flag-Konfiguration liegen in den vier Dateien unter `src/domain/thsRules/`; `scoring.ts` wertet sie zentral aus. Pflege und Anwendung: `docs/THS_RULE_CONFIGURATION.md`. Die folgenden Tabellen dokumentieren den unverändert übernommenen Ausgangsstand.

| Klasse/Badge | Voraussetzungen |
| --- | --- |
| VK1 „Aufstieg-VK2“ | Unterordnung ≥ 48, Gesamt ≥ 250; alle Veranstaltungsarten |
| VK2 „Aufstieg-VK3“ | Unterordnung ≥ 48, Gesamt ≥ 260; Vereins- oder Kreismeisterschaft |
| VK3 „swhv-Quali“ | Unterordnung ≥ 48, Gesamt ≥ 250; Vereins- oder Kreismeisterschaft |
| VK3 „dhv-Quali“ | Unterordnung ≥ 48, Gesamt ≥ 265; Verbandsmeisterschaft |
| VK3 „VDH-Quali“ | Unterordnung ≥ 54, Gesamt ≥ 270; alle Veranstaltungsarten |

Bei erfüllter VK3-dhv-Qualifikation wird swhv ebenfalls angezeigt. VDH-HL und VDH-DK haben keine Qualifikations- oder Aufstiegslogik.

VDH-S-VK-Schwellen nach Geschlecht und Altersklasse:

| Badge | Veranstaltung | männlich J/Ju/A/S | weiblich J/Ju/A/S |
| --- | --- | --- | --- |
| swhv | Verein/Kreis | 210 / 210 / 250 / 230 | 200 / 200 / 240 / 220 |
| dhv | Verband | 225 / 230 / 245 / 240 | 220 / 225 / 240 / 235 |
| VDH | alle | 250 / 260 / 270 / 260 | 240 / 250 / 263 / 250 |

J/Ju/A/S = Jüngsten-, Jugend-, Aktiven-, Seniorenklasse. Eine dhv-Qualifikation ergänzt kumulativ swhv.

## Detailfehler der Laufdisziplinen

Manuelle Gesamtfehler bleiben zulässig, solange keine Details erfasst sind. Mit Details ist die Summe automatisch und bindend.

- Hürde: nicht übersprungen/unterlaufen −4; Stange abgeworfen −2; Vorprellen/Nachhängen −2; Wendestange ausgelassen oder zur Abkürzung überstiegen je −10; Festhalten nach Start −2. VK1/2/DK haben vier, VK3/S-VK sechs Hürden. Mehrere Fehler an derselben Hürde werden addiert.
- Slalom: eines der fünf Streckentore ausgelassen −4 je Tor; Festhalten nach Start −2. Ein Tor wird nicht doppelt für Hund und Hundeführer berechnet.
- Hindernis: Hindernis ausgelassen −4; Oxer-Stange −1; Laufdiele seitlich aufgesprungen −4 oder abgesprungen −2; Hoch-Weit-Stange abgeworfen −1 oder unterlaufen −2; Festhalten −2. Doppelsprung sowie Aufsetzen auf Hürde/Tonne allein ergeben keinen Abzug. Auslassen und Detailfehler desselben Hindernisses dürfen nicht kombiniert werden.

## Digitaler Leistungsrichter

Die Leistungsrichterformulare sind unabhängige, nicht persistierte Bewertungsassistenten. Sie erzeugen kein offizielles Ergebnis und sind nicht mit einem Profil oder `CompetitionResult` verknüpft.

Bewertung je Übung: Höchstpunkte minus manuelle Abzüge, aktivierte feste Abzüge und gegebenenfalls Nullwertung; niemals unter 0 oder über der Höchstpunktzahl. Gesamtwertung ist die Summe der Übungen. Wertungsgrenzen:

| Max. | Vorzüglich | Sehr gut | Gut | Befriedigend | Mangelhaft ab |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 3 | 3 | 2,7 | 2,4 | 2,1 | 0 |
| 5 | 5 | 4,5 | 4 | 3,5 | 0 |
| 7 | 6,7 | 6,3 | 5,6 | 4,9 | 0 |
| 10 | 10 | 9 | 8 | 7 | 0 |
| 15 | 14,5 | 13,5 | 12 | 10,5 | 0 |
| 20 | 19,5 | 18 | 16 | 14 | 0 |
| 30 | 29 | 27 | 24 | 21 | 0 |
| 60 | 58 | 54 | 48 | 42 | 0 |
| 70 | 66,5 | 63 | 56 | 49 | 0 |
| 100 | 96 | 90 | 80 | 70 | 0 |

THS-Stufen summieren jeweils 60 Punkte: VK1 `15/20/10/15`, VK2 `20/10/15/15`, VK3 `20/10/15/15` gemäß den in `JudgeForm.tsx` benannten Übungen. Bei den implementierten Positionsregeln wird „Mangelhaft“ direkt als −3,5 bei 10 Maximalpunkten beziehungsweise −5 bei 15 Maximalpunkten dargestellt; weitere qualitative Fehler bleiben manuelle Eingaben.

IBGH1/2/3 summieren jeweils 100 Punkte; IBGH3 besitzt fünf Reihenfolgevarianten. Kriterien, Teilbudgets und Sonderregeln stehen in `src/domain/ibghJudging.ts` und `IbghJudgeForm.tsx`. Die allgemeine Zusatz-HZ-Regel ist als Information/teilweise manuelle Bewertung hinterlegt: erstes Zusatz-HZ −1,5, zwei Zusatz-HZ insgesamt −2,5, Nichtausführung nach insgesamt drei HZ Nullwertung, fehlendes Pflicht-HZ −2. Nicht jede Textregel ist als automatischer Abzug implementiert.

## Statistik und kritische Abhängigkeiten

Statistiken verwenden nur vollständige Ergebnisse derselben Klasse. Nicht bewertete oder unvollständige Daten fließen nicht ein. Berechnet werden Minimum, Maximum, Mittelwert, Stichproben-Standardabweichung, interne Steigung sowie eine lineare Prognose aus höchstens fünf letzten Werten. Steigung und „Sportlicher Trend“ sind derzeit nicht in der UI sichtbar. Für Zeit, Fehler und VDH-HL-Gesamtwert ist niedriger besser; eine Korrelation wird nicht als Ursache dargestellt.

Änderungen an Typen betreffen mindestens Scoring, Formular, Backup, Dexie-Migration, Cloud-Validierung, Statistik und Tests. Änderungen an Profilen müssen denormalisierte Ergebnisnamen und Queue-Einträge berücksichtigen.

## Quellenstatus

- Implementierte THS-Regeln stammen aus den vom Auftraggeber im Entwicklungsverlauf gelieferten Tabellen, Schwellen und Grafiken.
- IBGH-Anforderungen wurden aus einer bereitgestellten FCI-Prüfungsordnung 2025 abgeleitet; die PDF und Seitenbelege sind nicht im Repository versioniert.
- Es gibt aktuell keine regelweise Quellen-ID, Regelwerksversion oder Verifikationsmetadaten im Code.

Vor fachlichen Änderungen ist deshalb die maßgebliche Originalquelle erneut bereitzustellen und gegen Implementierung sowie Tests zu prüfen. Fehlende qualitative Regeln dürfen nicht in feste Abzüge umgedeutet werden.

