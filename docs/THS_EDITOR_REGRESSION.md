# THS-Ergebnisbearbeitung: Schrittwechsel löste Speichern aus

## Ursache und Korrektur

Am 2026-11-14 mit einem vollständigen Ergebnis reproduziert: Beim Tippen auf „Weiter“ in Schritt 2 änderte React dasselbe Button-DOM-Element von `type="button"` zu `type="submit"`. Die noch laufende native Klickaktivierung löste dadurch Submit aus. Das vorhandene Speichern leerte anschließend bestimmungsgemäß die Maske. Es gab keine JavaScript-Exception und keinen Verlust des gespeicherten Ergebnisses; der Schrittwechsel schrieb jedoch unbeabsichtigt den Datensatz und dessen Änderungszeitstempel.

Der Test vor der Korrektur protokollierte beim Tippen auf „Weiter“ ein Submit mit dem Buttontext „Ergebnis speichern“. Unterschiedliche gespeicherte Wizard-Schritte und Navigationswege erklären, warum der Fehler nicht bei jedem Öffnen auftrat. Die eng begrenzt gelesenen Cloud-Leistungsfelder der genannten Turniere waren strukturell gültig.

`Editor` in `src/App.tsx` unterscheidet die Button-Identitäten jetzt mit React-Keys und unterbindet die native Standardaktion des Weiter-Klicks ausdrücklich. Berechnungen, Qualifikationsregeln, Speicherung und Datenmodelle bleiben unverändert. Zusätzlich darf `.result-entry-navigation` umbrechen, damit die vier Aktionen eines gespeicherten Ergebnisses auf mobilen Bildschirmen keinen horizontalen Überlauf verursachen.

## Wiederholbarer Selbsttest

`npm run test:browser:ths` führt `scripts/ths-editor-browser-check.mjs` aus. Bei Nutzung des Systembrowsers auf dieser Umgebung: `BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:browser:ths`.

Der Harness baut die produktive App mit Test-Konfiguration, verwendet eine isolierte Browserdatenbank und synthetische Profile, blockiert/interzeptiert alle externen Requests und schreibt keine Testdaten nach Supabase. Die beiden gemeldeten Turniere werden mit ihren relevanten Leistungswerten, aber synthetischen Identitäten nachgestellt. Danach entstehen 20 weitere Ergebnisse vollständig über die Oberfläche. Alle 20 werden aus der Liste erneut geöffnet, durch die Schritte navigiert, bearbeitet und gespeichert. Die beiden Nachstellungen bleiben zusätzlich erhalten; erwarteter lokaler Gesamtbestand: 22.

Pro Bearbeitung wird die erste relevante Laufzeit um 1,25 Sekunden erhöht, Veranstaltung und Notiz geändert. Geprüft werden: kein Submit/keine Datenbankänderung durch „Weiter“, unabhängig vorgegebene Gesamtwerte und Badges, korrekte Dezimaleingabe, erhaltene Ergebnis-/Profil-IDs und Erstellungszeit, geänderter Änderungszeitpunkt, keine Duplikate, erhaltene Detailfehler, geleerte Maske nach explizitem Speichern und unveränderte Persistenz nach Neuladen. Zusätzlich: mobile Breite 390 px und Tastatur-Navigation in der 1280-px-Desktopdarstellung. Browser-/CSP-Fehler führen zum Testfehler. Statusmeldungen werden über ihren regulären Schließen-Button bestätigt.

## Sollwertmatrix

Die Sollwerte stehen unabhängig von `calculateScore` in `scripts/ths-editor-fixtures.mjs`. „Nachher“ bezeichnet die zusätzliche Laufzeit von 1,25 Sekunden. Bei HL erhöht sich die Gesamtzeit; bei den anderen Disziplinen sinken die Punkte.

Die am selben Tag parallel veröffentlichten Qualifikationszeiträume und Jahresflags aus Commit `f0bea4d` sind vollständig enthalten. Das synthetische Veranstaltungsdatum 01.11.2026 ergibt bei erfüllten Bedingungen `SWHV-QUALI-27`, `DHV-QUALI-26` und `VDH-QUALI-27`. Die folgenden Kurzbezeichnungen swhv/dhv/VDH stehen für diese exakten Jahresflags; im Browser werden ausdrücklich die vollständigen Flagtexte geprüft. Die vorhandenen Grenzdatums-/Jahrestests bleiben unverändert erhalten.

| Fall | Disziplin | Vorher → Nachher | Badges vorher → nachher |
| --- | --- | --- | --- |
| 1 | VDH-VK1 | 250,00 → 248,75 | Aufstieg-VK2 → keine |
| 2 | VDH-VK1, UO 47,9 | 237,90 → 236,65 | keine → keine |
| 3 | VDH-VK1, UO 60 | 265,00 → 263,75 | Aufstieg-VK2 → bleibt |
| 4 | VDH-VK2, Vereinsprüfung | 260,00 → 258,75 | Aufstieg-VK3 → keine |
| 5 | VDH-VK2, Kreismeisterschaft | 261,00 → 259,75 | Aufstieg-VK3 → keine |
| 6 | VDH-VK2, Verbandsmeisterschaft | 260,00 → 258,75 | keine → keine |
| 7 | VDH-VK3 | 250,00 → 248,75 | swhv → keine |
| 8 | VDH-VK3, Verbandsmeisterschaft | 275,00 → 273,75 | swhv/dhv/VDH → bleiben |
| 9 | VDH-VK3 | 270,00 → 268,75 | swhv/VDH → nur swhv |
| 10 | VDH-VK3, Schwedt-Nachstellung | 279,09 → 277,84 | keine → keine |
| 11 | VDH-VK3, Ettlingen-Nachstellung | 272,43 → 271,18 | swhv/VDH → bleiben |
| 12 | VDH-S-VK, männlich/Aktive | 245,00 → 243,75 | keine → keine |
| 13 | VDH-S-VK, männlich/Aktive | 255,00 → 253,75 | swhv → bleibt |
| 14 | VDH-S-VK, weiblich/Aktive, Verband | 249,00 → 247,75 | swhv/dhv → bleiben |
| 15 | VDH-S-VK, männlich/Aktive, Verband | 280,00 → 278,75 | swhv/dhv/VDH → bleiben |
| 16 | VDH-DK, alle Disziplinen mit Leine | 195,00 → 193,75 | keine → keine |
| 17 | VDH-DK, gemischt, Detailfehler | 197,00 → 195,75 | keine → keine |
| 18 | VDH-DK, alle Disziplinen ohne Leine | 210,00 → 208,75 | keine → keine |
| 19 | VDH-HL, ohne Leine, Detailfehler | 25,00 s → 26,25 s | keine → keine |
| 20 | VDH-HL, einmal mit Leine, VDH-DM | 31,00 s → 32,25 s | keine → keine |

Die Tests dienen der Regression des implementierten Regelstands, nicht der erneuten fachlichen Verifikation der Prüfungsordnung. Sie simulieren mobile Bedienung mit Chromium; ein physisches iPhone ist nicht Teil des automatisierten Laufs.

## Prüfergebnis vom 14.11.2026

Auf dem aktuellen Stand einschließlich `f0bea4d`: alle 20 Neuanlagen, alle 20 Bearbeitungen und die beiden zusätzlichen Nachstellungen erfolgreich; Persistenz nach Neuladen und Tastaturnavigation in der Desktopdarstellung bestätigt. `npm test`: 373 Tests in 45 Dateien erfolgreich. Lint und Produktions-Build erfolgreich. `test:browser:security` einschließlich THS/IBGH-Navigation, Import/CSV/Statistik, Community, Teilen, Lesestatus, Personalisierung und Einladungen ebenfalls erfolgreich; keine Laufzeit- oder CSP-Fehler. Keine produktiven Testdatensätze und keine Datenmigration.
