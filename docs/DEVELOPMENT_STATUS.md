# Entwicklungsstand

Stand: 2026-11-09. Basis ist der Branch `feature/ui-ux-modernization`; `28fc5ac` war der Ausgangspunkt der nachfolgend beschriebenen Navigationsänderungen. Die konkrete Produktionszuordnung ist in Git- und Vercel-Deployment-Historie zu prüfen. Der Branch ist noch nicht als Merge nach `main` dokumentiert.

## Implementiert

- Anmeldungspflicht über Supabase mit E-Mail/Passwort, Registrierung, Passwort-Reset/-Änderung und vollständigem Auth-Gate.
- Offline-First-Dexie-Speicherung plus benutzergebundener Supabase-Sync, RLS, Tombstones, Konfliktauflösung und sichtbarer Sync-Status.
- Globale Hundeführer- und Hundeprofile; Zuordnung jedes THS-Ergebnisses; referenzierte Profile sind vor Löschung geschützt.
- THS-Erfassung und Bearbeitung für VDH-VK1/2/3, VDH-S-VK, VDH-HL und VDH-DK einschließlich Entwürfen, dreistufigem Wizard, Leinen-/1000-m-Sonderdaten, Gesamtpunkten und Qualifikationen.
- Optionale Detailfehler für Hürde, Slalom und Hindernis mit exakten Referenzgrafiken, interaktiven Treffern, Rotmarkierung und Summenabgleich.
- JSON-Backup/Restore, Legacy-Migration und CSV-Export.
- THS-Ergebnisliste mit Filtern; Statistik/Diagramm für vollständige Ergebnisse.
- Digitaler Leistungsrichter THS und IBGH mit Übungen, Detailkriterien, festen/manuellen Abzügen, Nullwertungen und Wertungstexten.
- FCI-IBGH1/2/3 einschließlich der fünf IBGH3-Varianten im Leistungsrichter.
- PWA-Installation/Offline-Assets, responsive mobile UI, System-/Hell-/Dunkel-Theme, Feedback-Center, Zurücknavigation und „Eingaben löschen“.
- Richtungsabhängige Seitenübergänge mit View-Transitions-Fallback, Browser-Zurück und begrenzter horizontaler Wischsteuerung ohne Editor-/Diagramm-/Tabellenkonflikte.
- Einheitliche Leistungsrichteranzeige: Fehlerwerte als `FP`, erreichte Werte und Abzüge als `Punkte`, deutsche Dezimaldarstellung ohne unnötige Nachkommastellen.
- CI mit Node 22, Test, Lint und Build.

## Letzte relevante Änderungen

Commit `28fc5ac` modernisierte die Oberfläche ohne beabsichtigte Fachlogikänderung:

- einheitliche Design-Tokens und manuelle Theme-Auswahl;
- progressiver Ergebnis-Wizard mit Wischsteuerung und Wiederaufnahme;
- Feedback-Ereignisse für CRUD, Profile, persönliche Bestleistungen und Qualifikationen;
- besser lesbare Zahlen im Leistungsrichter;
- theme-fähige Diagramme; sichtbare Steigungs-/Trendanzeige entfernt;
- Import/Export nach unten verschoben und PWA-Asset-Precache erweitert.

Änderungen vom 2026-11-09:

- App-Swipes für logisch zusammenhängende Top-Level-Ansichten; Rand-, Formular-, Tabellen-, Diagramm- und Dialoginteraktionen sind geschützt;
- direkter visueller Gestenversatz, Rückfederung und richtungsabhängige 220-ms-Übergänge;
- Browser-History für Module, Tabs und globale Panels;
- richtungsabhängige Wizard-Schrittanimation bei unveränderter Entwurfssicherung;
- zentrale `MeasurementValue`-Darstellung für `0 FP`, `7 FP`, `55 Punkte`, `−7 Punkte` und Dezimalwerte.

Die aktuelle Prüfung nach Integration des Security-Audits umfasst 38 Testdateien mit 296 Tests, einen produktiven Dependency-Audit ohne Befund, warnungsfreies Lint, einen erfolgreichen Produktions-Build sowie den Browser-Security-Harness ohne CSP- oder Laufzeitfehler.

## Bekannte Fehler und Grenzen

Keine reproduzierbaren Laufzeitfehler sind für den dokumentierten Stand bekannt. Folgende funktionale Grenzen sind verifiziert:

- IBGH-Ergebnisse, Neuer Eintrag und Statistik sind Platzhalter; nur Dashboard und Leistungsrichter funktionieren.
- Leistungsrichter-Sitzungen werden weder gespeichert noch Profilen/Ergebnissen zugeordnet und stellen kein offizielles Prüfungsergebnis dar.
- IFH wurde absichtlich vollständig entfernt. `VITE_MAPTILER_KEY` in `.env.example` ist ungenutzt.
- Apple-Anmeldung ist nicht implementiert.
- Fachliche Originalquellen und Regelversionen fehlen im Repository; regelweise Provenienz ist nicht umgesetzt.
- `src/App.tsx` bündelt viele Ansichten und ist entsprechend groß; Umbauten bergen Regressionsrisiko.
- `README.md` enthält teilweise ältere UI-Beschreibungen und ist nicht die maßgebliche Übergabedokumentation.
- Vercel Deployment Protection war beim letzten Test aktiv; automatisierte Browserzugriffe benötigen geeignete Authentifizierung.

## Offene Aufgaben

Priorisiert, aber nicht automatisch autorisiert:

1. Aktuellen Branch prüfen und bewusst nach `main` mergen; Produktion danach erneut testen.
2. Fachliche Primärdokumente versionieren oder extern eindeutig referenzieren und Regel-Metadaten ergänzen.
3. IBGH-Produktentscheidung treffen: Ergebnisdatenmodell, Speicherung, Erfassung und Statistik implementieren oder Platzhalter entfernen.
4. Leistungsrichter-Persistenz und Übernahme in Ergebnisse nur nach geklärtem fachlichem Status entwerfen.
5. `App.tsx` schrittweise in Screens/Feature-Module zerlegen; Navigation und Berechnungen unverändert lassen.
6. Veraltete README-Aussagen mit dieser Dokumentation abgleichen.
7. Ungenutzte MapTiler-Konfiguration nach Bestätigung entfernen.

IFH, GPS/Karten und Apple OAuth sind keine aktiven Aufgaben. Sie benötigen einen neuen ausdrücklichen Auftrag.

## Empfohlener Ablauf für die nächste Session

1. `AGENTS.md` und die drei Dokumente lesen.
2. `git status`, aktuellen Branch/Commit und Abweichungen zu `main` prüfen.
3. Betroffene Domänendateien und Tests als letzte Wahrheit lesen.
4. Vor Fachänderungen Quelle, erwartete Grenzfälle und Datenmigration klären.
5. Gezielt implementieren, Tests ergänzen, anschließend `npm test`, `npm run lint`, `npm run build` ausführen.

## Noch fehlende Informationen

- Autoritative, versionierte Regelwerke für THS und IBGH samt Seiten-/Versionsbezug.
- Entscheidung, ob und wann der Feature-Branch nach `main` übernommen wird.
- Gewünschter langfristiger Umfang der IBGH-Ergebnisverwaltung.
- Ob Deployment Protection in Produktion beibehalten werden soll.
