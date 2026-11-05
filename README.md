# #Dogsports

Installierbare, offlinefähige Hundesport-PWA mit den Modulen THS und IBGH.

Das visuelle System basiert auf dem #Dogsports-Banner in `public/dogsports-banner.webp`: Schwarz/Anthrazit (`#111212`), Weiß (`#FEFEFE`), Stahlblau (`#1776A7`), Hauptblau (`#31ABE4`), Cyan (`#59D3F9`) und kühles Neutralblau (`#A2C0CE`).

## Implementiert

- modulares Dashboard mit THS-/IBGH-Modulübersicht und iPhone-Bottom-Navigation
- CRUD für vollständige Ergebnisse und Entwürfe, eindeutige UUIDs und Zeitstempel
- globale Hundeführer- und Hundeprofile mit Stammdaten, automatisch berechnetem Alter und geschützter Ergebniszuordnung
- automatische Formular-Zwischenspeicherung sowie dauerhafte IndexedDB-Persistenz mit Dexie
- exakte FCI-VK1/2/3-Gesamtpunkteberechnung und kumulative Qualifikationen
- optionale Hürdenfehler-Details für FCI-VK1/2/3 mit stufenspezifischem interaktivem Schaubild, festen Einzelabzügen und automatischer Summierung
- optionale Slalomfehler-Details für FCI-VK1/2/3 mit interaktivem Vier-Tore-Schaubild, torbezogenen Abzügen und automatischer Summierung
- optionale Hindernislauffehler-Details für FCI-VK1/2/3 mit beschriftetem Acht-Hindernis-Schaubild, Einzelstangenbewertung und automatischer Summierung
- THS-Ergebniserfassung und Statistik für VDH-S-VK, VDH-HL und VDH-DK mit disziplinspezifischer Berechnung
- HL mit zwei Hindernisläufen, Leinen-Strafsekunden und kleinerer Gesamtzeit als besserem Ergebnis
- DK ohne Unterordnung mit fünf Bonuspunkten je Laufdisziplin ohne Leine
- S-VK mit tatsächlicher 1000-m-Streckenlänge, normiertem Zeitwert, Frühstartabzug und alters-/geschlechtsabhängigen Qualifikationen
- Suche, Stufen-/Qualifikationsfilter, Entwurfsschalter und Sortierung
- kompakte mobile Karten und horizontal scrollbarere vollständige Ergebnistabelle
- Bestleistungen einschließlich Gleichständen
- acht Statistikfelder, Zeit- und Stufenfilter, Minimum, Maximum, Mittelwert, Stichproben-Standardabweichung, Trend und begrenzte Prognose
- interaktive Recharts-Diagramme mit Messpunkten, Tooltip, Mittelwert und Prognosepunkt
- deutsches JSON-Backup mit Schema- und Konfliktprüfung sowie Excel-kompatibler CSV-Export
- Hell-/Dunkelmodus entsprechend der Systemeinstellung
- offlinefähige PWA ohne Tracking, Konto, Server oder kostenpflichtige APIs

## Fachlogik

Die reproduzierbare Berechnung liegt in `src/domain/scoring.ts`. Optionale Hürdenfehler-Details werden in `src/domain/hurdleFaults.ts` validiert und zu genau dem Fehlerwert summiert, den die Gesamtberechnung einmalig abzieht:

```text
Gesamt = Grundwert + Unterordnung
         − Hürdenzeit − Hürdenfehler
         − Slalomzeit − Slalomfehler
         − Hinderniszeit − Hindernisfehler
```

Grundwerte: FCI-VK1 `250`, FCI-VK2 `255`, FCI-VK3 `265`. Erst ein vollständig valider Datensatz erhält Gesamtpunkte oder Qualifikationen. Aufstieg-VK3 und swhv-Quali gelten für Vereinsprüfung/Kreismeisterschaft, die dhv-Quali für die Verbandsmeisterschaft und die VDH-Quali für alle fünf Turnierarten. Auf einer Verbandsmeisterschaft schließt die dhv-Quali kumulativ die swhv-Quali ein. Nach jedem erfolgreichen Speichern wird die Eingabemaske geleert; Bearbeitungen beginnen ausschließlich über die Ergebnisübersicht.

Statistiklogik befindet sich in `src/domain/statistics.ts`. Die Standardabweichung verwendet `n − 1`; der Trend regressiert über die letzten drei, die Prognose über die letzten maximal fünf Werte. Prognosen sind ausdrücklich als Schätzung markiert.

## Architektur

```text
src/
  components/ui/       gemeinsame shadcn/ui-Primitiven
  data/
    db.ts               Dexie-Datenbank, Profil-/Ergebnis-CRUD und Migrationen
    backup.ts           JSON-Validierung/-Import und JSON-/CSV-Export
  domain/
    types.ts            THS-Domänenmodell
    profiles.ts         globale Hundeführer-/Hundemodelle und Alterslogik
    scoring.ts          Validierung, Gesamtpunkte, Qualifikationen
    statistics.ts       Kennwerte, Regression, Trend, Prognose
    results.ts          Filter, Sortierung, Bestleistungen
  test/                 Testdaten-Fabrik
  App.tsx               App-Shell und modulare Ansichten
```

Die Startseite trennt die Sportbereiche THS und IBGH. Nach der Modulauswahl stehen in beiden Bereichen dieselben fünf Navigationsziele bereit: Dashboard, Digitaler Leistungsrichter, Ergebnisse, Neuer Eintrag und Statistik. Der aktive Modulbereich bleibt in der Kopfzeile sichtbar. Die bestehenden THS-Funktionen bleiben unverändert; Ergebnisse, neuer Eintrag und Statistik sind im Modul IBGH zunächst klar gekennzeichnete Platzhalter ohne Datenspeicherung.

Die Digitalen Leistungsrichter VDH-VK und FCI-IBGH liegen als interaktive Entwürfe mit konfigurierbaren Unteraufgaben, Detailabzügen und automatischen Wertungen vor. FCI-IBGH3 unterstützt zusätzlich fünf vorgeschriebene Übungsreihenfolgen.

## Lokale Datenmigration

Dexie aktualisiert bestehende Datenbanken beim ersten Start auf Version 5. Dabei werden globale Tabellen für Hundeführer und Hunde ergänzt. Namen aus vorhandenen THS-Ergebnissen werden ohne Änderung der Leistungsdaten in gemeinsame Profile überführt und die Ergebnisse über stabile IDs verknüpft. Unbekannte Stammdaten werden sichtbar als noch zu ergänzen markiert. Eine manuelle Migration oder Serverkonfiguration ist nicht erforderlich.

Profile werden über **Profile** in der globalen Kopfzeile verwaltet und stehen unabhängig vom geöffneten Modul zur Verfügung. Bereits in Ergebnissen verwendete Profile können bearbeitet, aber nicht versehentlich gelöscht werden. JSON-Backups ab Version 2 enthalten Ergebnisse und beide Profilarten; Version 3 ergänzt die disziplinspezifischen HL-, DK- und S-VK-Daten. Ältere Backups werden beim Import automatisch in die aktuelle Struktur überführt.

## Lokal starten und prüfen

Voraussetzung: Node.js 20 oder neuer.

```bash
npm ci
npm run dev
```

Qualitätssicherung:

```bash
npm test
npm run lint
npm run build
npm run preview
```

Die Tests decken FCI-Berechnung, Grenzwerte, kumulative Qualifikationen, Entwürfe, ungültige Werte, Statistik, Trend, Prognose, Filter, Sortierung, Bestleistungen, Backup-Konflikte und IndexedDB-Wiederherstellung ab. GitHub Actions führt Test, Lint und Build automatisch aus.

## Bereitstellung

`npm run build` erzeugt `dist/`. Das Projekt ist für Vercel mit Framework-Preset **Vite**, Build-Befehl `npm run build` und Output-Verzeichnis `dist` ausgelegt. Das GitHub-Repository darf privat bleiben, solange die Vercel-GitHub-App Zugriff darauf besitzt; öffentliche Sichtbarkeit ist für Vercel nicht erforderlich. Alternativ kann `dist/` auf jedem statischen HTTPS-Host veröffentlicht werden.

HTTPS ist für Service Worker und Installation außerhalb von `localhost` erforderlich. Nach dem ersten vollständigen Laden funktioniert die App offline.

## Installation auf dem iPhone

1. Die bereitgestellte HTTPS-Adresse in **Safari** öffnen.
2. Auf **Teilen** tippen.
3. **Zum Home-Bildschirm** auswählen.
4. Namen bestätigen und **Hinzufügen** tippen.
5. #Dogsports einmal vom Home-Bildschirm öffnen.

Alle Fachdaten bleiben lokal auf diesem Gerät. Eine Neuinstallation oder das Löschen von Safari-Websitedaten kann sie entfernen. Deshalb regelmäßig unter **Ergebnisse → JSON** ein Backup speichern. Wiederherstellung erfolgt über **Import**; bei ID-Konflikten kann Überspringen oder Ersetzen gewählt werden.

## Bekannte technische Einschränkung

Der JavaScript-Hauptchunk liegt wegen Recharts über Vites 500-kB-Warnschwelle. Dies beeinträchtigt Funktion und Offline-Nutzung nicht; bei Wachstum weiterer Module sollte routenbasiertes Code-Splitting ergänzt werden.
