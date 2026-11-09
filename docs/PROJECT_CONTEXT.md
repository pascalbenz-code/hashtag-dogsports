# Projektkontext #Dogsports

Stand: 2026-11-09, Branch `feature/ui-ux-modernization`; Basis-Commit `28fc5ac` mit nachfolgenden lokalen Änderungen.

## Ziel und Architektur

#Dogsports ist eine deutschsprachige, mobile Offline-First-PWA zur Erfassung und Auswertung von Hundesportleistungen. Die App läuft als React-Single-Page-Anwendung. `App.tsx` steuert Navigation und Ansichten über React-State; React Router wird nicht verwendet. Top-Level-Wechsel erzeugen Browser-History-Einträge und nutzen maßstabile CSS-Übergänge.

| Schicht | Verantwortung |
| --- | --- |
| `src/domain/` | Typen, Validierung, Berechnung, Qualifikation, Bewertungs- und Fehlerregeln |
| `src/data/` | Dexie-Schema, CRUD, Backups, Import/Export und Cloud-Synchronisation |
| `src/components/` | Formulare, Leistungsrichter, Diagramme, Feedback und UI-Primitives |
| `src/theme/` | System-/Hell-/Dunkel-Theme und Design-Tokens |
| `src/test/` | Testaufbau, IndexedDB-/Browser-Mocks |

Technologien: React 19, TypeScript, Vite 8, Tailwind CSS 4, Radix Slot/CVA, Dexie 4, Supabase JS 2, Recharts 3, Lucide, vite-plugin-pwa und Vitest. Die PWA cached die Anwendung und Bildressourcen; fachliche Daten liegen nicht im PWA-Cache.

## Module und Navigation

Nach erfolgreicher Supabase-Anmeldung zeigt die Startseite die Modulauswahl. Jedes aktive Modul besitzt eine mobile Navigation mit Dashboard, Leistungsrichter, Ergebnisse, Neuer Eintrag und Statistik.

| Bereich | Tatsächlicher Stand |
| --- | --- |
| THS | Vollständig angebunden: Dashboard, Ergebnisliste/-bearbeitung, dreistufige Erfassung, Import/Export, Statistik und digitaler Leistungsrichter. Disziplinen VDH-VK1/2/3, VDH-S-VK, VDH-HL und VDH-DK. |
| IBGH | Dashboard und digitaler Leistungsrichter für FCI-IBGH1/2/3 einschließlich IBGH3-Varianten. Ergebnisse, Neuer Eintrag und Statistik sind sichtbare Platzhalter ohne Speicherung. |
| IFH | Bewusst vollständig entfernt. Keine Navigation, Domänentypen oder Speicherung. Dexie-Version 4 entfernt nur den früheren Legacy-Store. Die ungenutzte Variable `VITE_MAPTILER_KEY` ist kein implementiertes Kartenmodul. |
| Weitere Module | Keine. VDH-S-VK, VDH-HL und VDH-DK sind THS-Disziplinen, keine eigenen Module. |

Globale Ansichten verwalten Hundeführer- und Hundeprofile. Ergebnisse werden über IDs einem vorhandenen Profil zugeordnet. Alter wird aus Geburts- und Veranstaltungsdatum berechnet und nicht gespeichert.

## Datenmodelle und Speicherung

Globale Community mit Vereinen, offenen Kontomitgliedschaften und explizit geteilten Ergebniszusammenfassungen: siehe `docs/COMMUNITY.md` für Architektur, Tabellen, Zugriffsrechte und Grenzen. Bestehende Profil-Vereinsangaben werden als Suchvorschläge verwendet.

`CompetitionResult` enthält Veranstaltung, Disziplin, Hundeführer-/Hundreferenz, Unterordnung, Laufzeiten, Fehler, optionale Detailfehler, Leinenstatus, 1000-m-Daten, Notizen und Zeitstempel. `HandlerProfile` und `DogProfile` enthalten Stammdaten und optionale Vereins- beziehungsweise LU-Daten. Maßgeblich sind `src/domain/types.ts` und `src/domain/profiles.ts`.

Dexie-Datenbank `dogsport`:

- `results`, `handlers`, `dogs`: lokale Fachdaten.
- `syncQueue`: ausstehende Upserts/Löschmarkierungen.
- `syncMeta`: Benutzerbindung und letzter Sync.

Dexie v5 erzeugte für ältere Ergebnisse additive Profile; v6 ergänzte Cloud-Sync. CRUD und Queue-Schreiben erfolgen transaktional. Unvollständige Ergebnisse dürfen ausdrücklich als Entwurf gespeichert werden. Der aktuelle Formularstand liegt zusätzlich lokal unter `dogsport-form-draft`; der Wizard-Schritt ist je Ergebnis gespeichert.

Supabase speichert alle drei Entitätstypen in `dogsports_records` als JSONB oder Tombstone. Primärschlüssel ist `(user_id, entity_type, record_id)`. RLS erlaubt authentifizierten Benutzern ausschließlich eigene Zeilen. Die lokale Datenbank wird dauerhaft an den ersten angemeldeten Benutzer gebunden, um Kontovermischung zu verhindern. Konflikte werden anhand der Client-Zeitstempel aufgelöst; lokale Queue-Einträge und Löschungen bleiben synchronisierbar. Migration: `supabase/migrations/20261106120000_create_dogsports_records.sql`.

Backups verwenden JSON-Schema-Version 3 und enthalten Ergebnisse sowie Profile. Import akzeptiert `#Dogsports` und den Legacy-Namen `#Dogsport`, validiert Strukturen und kann Konflikte ersetzen oder überspringen. CSV ist semikolongetrennt, UTF-8 mit BOM und verwendet deutsche Zahlenformate.

## UI-Struktur

- Auth-Gate blockiert die komplette Fachanwendung ohne gültige Sitzung.
- Startseite: THS-/IBGH-Auswahl und globale Profilverwaltung.
- THS-Erfassung: Zuordnung → Prüfungsdaten → Leistungsdaten; Zwischenspeichern/Wiederaufnehmen und Wischgesten.
- App-Wischsteuerung: Dashboard → Leistungsrichter → Ergebnisse → Neuer Eintrag → Statistik nach links; nach rechts entlang des Browser-Verlaufs. Innerhalb des THS-Formulars wechseln Gesten zunächst die drei Eingabeschritte; am ersten/letzten Schritt führen sie zur Ergebnisliste/Statistik. Formfelder, Diagramme, Tabellen und Bildschirmränder bleiben geschützt.
- Ergebnisbearbeitung wird aus der Ergebnisliste geöffnet; finales Speichern leert die Maske.
- Referenzgrafiken für Hürde, Slalom und Hindernislauf sind interaktiv überlagert; hinterlegte Fehler werden rot markiert.
- System/Hell/Dunkel ist über CSS-Tokens umgesetzt und in `dogsports-theme` gespeichert.
- Feedback-Center meldet Speichern/Löschen/Profile und neue persönliche beziehungsweise Qualifikations-Erfolge.

## Relevante Dateien

| Thema | Dateien |
| --- | --- |
| App-Shell/Ansichten | `src/App.tsx` |
| Navigation/Animation | `src/domain/appNavigation.ts`, `src/hooks/useSwipeNavigation.ts`, `src/lib/viewTransition.ts` |
| Typen/Profile | `src/domain/types.ts`, `src/domain/profiles.ts` |
| Ergebnisse | `src/domain/scoring.ts`, `src/domain/resultForm.ts` |
| Fehlerdetails | `src/domain/hurdleFaults.ts`, `slalomFaults.ts`, `obstacleFaults.ts`; gleichnamige Komponenten |
| Leistungsrichter | `src/domain/judging.ts`, `src/components/DigitalJudgeForm.tsx`, `JudgeForm.tsx`, `IbghJudgeForm.tsx` |
| Statistik | `src/domain/statistics.ts`, `src/components/PerformanceChart.tsx` |
| Lokal/Cloud | `src/data/db.ts`, `src/data/cloudSync.ts`, `src/hooks/useCloudSync.ts`, `src/lib/supabase.ts` |
| Auth/Sync-UI | `src/components/AuthGate.tsx`, `CloudSyncPanel.tsx` |
| Backup | `src/data/backup.ts` |
| Theme/Feedback | `src/theme/`, `src/components/ThemeSettings.tsx`, `src/feedback/` |
| PWA/Build/CI | `vite.config.ts`, `package.json`, `.github/workflows/ci.yml` |
| Sicherheit | `docs/SECURITY_AUDIT.md`, `src/data/validation.ts`, `scripts/security-browser-check.mjs`, `vercel.json` |

