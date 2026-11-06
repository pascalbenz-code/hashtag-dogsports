# #Dogsports

Installierbare, offlinefähige Hundesport-PWA mit den Modulen THS und IBGH.

Das visuelle System basiert auf dem #Dogsports-Banner in `public/dogsports-banner.webp`: Schwarz/Anthrazit (`#111212`), Weiß (`#FEFEFE`), Stahlblau (`#1776A7`), Hauptblau (`#31ABE4`), Cyan (`#59D3F9`) und kühles Neutralblau (`#A2C0CE`).

## Implementiert

- modulares Dashboard mit THS-/IBGH-Modulübersicht und iPhone-Bottom-Navigation
- CRUD für vollständige Ergebnisse und Entwürfe, eindeutige UUIDs und Zeitstempel
- globale Hundeführer- und Hundeprofile mit Stammdaten, automatisch berechnetem Alter und geschützter Ergebniszuordnung
- automatische Formular-Zwischenspeicherung sowie dauerhafte IndexedDB-Persistenz mit Dexie
- optionale Supabase-Konten mit automatischer Offline-First-Synchronisation aller Ergebnisse sowie Hunde- und Hundeführerprofile
- sichtbare Sync-Warteschlange, manueller Abgleich, Wiederaufnahme nach Netzrückkehr, Lösch-Tombstones und deterministische Konfliktauflösung
- kontogetrennte Cloud-Daten durch Supabase Row Level Security (RLS)
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
- offlinefähige PWA ohne Tracking; ein Cloud-Konto ist optional und die lokale Nutzung bleibt jederzeit möglich

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
    cloudSync.ts        bidirektionaler Supabase-Abgleich und Validierung
  domain/
    cloudSync.ts        reine Konfliktauflösung und Sync-Datentypen
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

## Datenmigration und Cloud-Sicherung

Dexie aktualisiert bestehende Datenbanken beim ersten Start auf Version 6. Dabei werden globale Tabellen für Hundeführer und Hunde sowie eine Sync-Warteschlange und Sync-Metadaten ergänzt. Namen aus vorhandenen THS-Ergebnissen werden ohne Änderung der Leistungsdaten in gemeinsame Profile überführt und die Ergebnisse über stabile IDs verknüpft. Unbekannte Stammdaten werden sichtbar als noch zu ergänzen markiert.

Die App bleibt offline-first: Jede Änderung wird zuerst atomar in IndexedDB gespeichert. Ist ein Supabase-Konto angemeldet, werden offene Änderungen anschließend übertragen. Beim ersten Abgleich werden auch alle schon vor der Cloud-Einführung vorhandenen lokalen Daten hochgeladen. Löschungen werden als Tombstones synchronisiert. Bei konkurrierenden Änderungen gewinnt der neuere Änderungszeitpunkt; eine während des Abgleichs neu entstandene lokale Änderung wird nicht überschrieben. Eine lokale Installation wird dauerhaft an die erste verwendete Benutzer-ID gebunden, damit Daten verschiedener Konten niemals vermischt werden.

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

### Supabase einmalig einrichten

1. Im Supabase-Projekt die Migration `supabase/migrations/20261106120000_create_dogsports_records.sql` ausführen (CLI oder SQL Editor).
2. Unter **Authentication → URL Configuration** die Site URL `https://hashtag-dogsports.vercel.app` und für lokale Entwicklung `http://localhost:5173/**` als Redirect URL eintragen.
3. In Vercel für Production, Preview und Development setzen:
   - `VITE_SUPABASE_URL`: Projekt-URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: veröffentlichbarer Publishable Key (alternativ der ältere Anon Key)
4. Niemals einen `service_role`-Schlüssel in Vite oder Vercel hinterlegen. Variablen mit Präfix `VITE_` sind absichtlich im Browser sichtbar; die Zugriffssicherheit kommt aus Auth und RLS.

Die Migration legt ausschließlich die additive Tabelle `dogsports_records` an. Vier getrennte RLS-Policies erlauben angemeldeten Benutzern nur `select`, `insert`, `update` und `delete` ihrer eigenen Zeilen. Es gibt keine öffentliche `anon`-Berechtigung.

## Installation auf dem iPhone

1. Die bereitgestellte HTTPS-Adresse in **Safari** öffnen.
2. Auf **Teilen** tippen.
3. **Zum Home-Bildschirm** auswählen.
4. Namen bestätigen und **Hinzufügen** tippen.
5. #Dogsports einmal vom Home-Bildschirm öffnen.

Ohne Anmeldung bleiben alle Fachdaten ausschließlich lokal auf diesem Gerät. Mit Anmeldung werden sie zusätzlich im persönlichen Supabase-Konto gesichert und zwischen Geräten abgeglichen. Eine Neuinstallation oder das Löschen von Safari-Websitedaten kann noch nicht synchronisierte Eingaben entfernen. Deshalb vor dem Löschen auf den grünen Cloud-Status achten und ergänzend regelmäßig unter **Ergebnisse → JSON** ein Backup speichern. Wiederherstellung erfolgt über **Import**; bei ID-Konflikten kann Überspringen oder Ersetzen gewählt werden.

## Bekannte technische Einschränkung

Der JavaScript-Hauptchunk liegt wegen Recharts über Vites 500-kB-Warnschwelle. Dies beeinträchtigt Funktion und Offline-Nutzung nicht; bei Wachstum weiterer Module sollte routenbasiertes Code-Splitting ergänzt werden.
