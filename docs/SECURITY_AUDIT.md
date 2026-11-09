# #Dogsports – Security Audit und Remediation

Stand: 8. November 2026 (Europe/Berlin). Prüfbranch: `security/audit-remediation`.
Basis: `28fc5ac9ed172b7cc91960c303b2d9056ab403a9` auf `feature/ui-ux-modernization`.
Der initiale Checkout war `main` (`318b546`); Vercel bestätigte den neueren UI-Branch als tatsächlich veröffentlichten Stand. Die Korrekturen bauen auf diesem Stand auf.

## Management Summary

Die Anwendung besitzt eine serverseitig wirksame Kontotrennung durch Supabase RLS. Es wurde kein bestätigter kontenübergreifender Zugriff über die vorhandene API und keine produktiv erreichbare Critical-/High-Lücke nachgewiesen. Das ist keine Garantie der Schwachstellenfreiheit. Die wichtigsten bestätigten Anwendungsprobleme waren unsichere CSV-Zellen, unvollständig geprüfte Backup-/Cloud-Daten sowie vermeidbare Überschreibkonflikte beim Import und Cloud-Abgleich.

Die Korrekturen sind im Repository implementiert und lokal geprüft. Produktivsysteme wurden ausschließlich über lesende Verwaltungsabfragen inspiziert. Keine produktiven Deployments, Migrationen, Rechteänderungen, Auth-Konfigurationsänderungen, produktiven Testdatensätze oder Angriffsversuche wurden durchgeführt. Der Audit-Branch ist in `vercel.json` für automatische Git-Deployments deaktiviert.

**Befundgruppen:** 0 Critical, 0 High, 6 Medium, 3 Low. Diese neun Gruppen sind Anwendungskontext-Bewertungen, keine Addition von npm-Paketmeldungen. Fünf Gruppen sind im Code behoben, eine Dependency-Gruppe teilweise behoben, drei Konfigurations-/Migrationsgruppen offen. Zusätzliche Härtungen werden getrennt ausgewiesen.

**Dependency-Ergebnis:** vorher 10 betroffene Paketknoten (2 critical, 5 moderate, 3 low), nachher 6 (0 critical/high, 4 moderate, 2 low), sämtlich Entwicklung/Build. Drei unterschiedliche Advisories verbleiben. `npm audit --omit=dev` meldet 0. Upstream-Schweregrade sind nicht automatisch produktive Anwendungsschweregrade.

## Sicherheitsprofil und Vertrauensgrenzen

| Grenze/Komponente | Festgestellte Architektur und Sicherheitswirkung |
| --- | --- |
| Browser/UI | React 19.3.1, TypeScript, Vite 8, Tailwind 4, Recharts, PWA/Workbox. Darstellung von Benutzerdaten über React-Text; keine gefundenen `dangerouslySetInnerHTML`, `eval`, Command-Ausführung oder dynamischen Script-URLs im Anwendungscode. |
| Lokale Daten | Dexie/IndexedDB `dogsport`, Schema v6: Ergebnisse, Hundeführer, Hunde, Sync-Warteschlange, Metadaten. `localStorage` hält Formularentwurf, Formularschritt, Theme und Supabase-Sitzung. Browser-/OS-Profilzugriff liegt außerhalb der RLS-Grenze. |
| Auth | Supabase E-Mail/Passwort, Registrierung, Passwort-Reset, persistente Sitzung/Token-Refresh. UI bleibt ohne Sitzung und während Recovery gesperrt. `getSession()` ist hier ein UI-Zustand, keine vertrauenswürdige Serverautorisierung. Tokens werden von Supabase geprüft; Auth-Ratenlimits/Passwortregeln müssen dort eingerichtet sein. |
| Browser → API | Supabase JS ruft `/auth/v1/*` und PostgREST `/rest/v1/dogsports_records` direkt über HTTPS auf. Bearer-Token statt eigener Cookie-API; keine eigene Serverless-/Backend-Route im Repository. Kein eigener SSR-, SSRF- oder Shell-Ausführungspfad gefunden. |
| API → DB | Projekt `eeuugnoccfdkgslvphql`, PostgreSQL 17.11, eu-central-1. Eine Anwendungstabelle, zusammengesetzter Primärschlüssel `(user_id, entity_type, record_id)`, Tombstone-Check, `auth.users`-FK. RLS enabled + forced; alle vier Policies prüfen `auth.uid() = user_id`, UPDATE auch `WITH CHECK`. Kein Einsatz von veränderbarem `user_metadata` zur Autorisierung. |
| Privilegierte DB-Funktionen | Eine öffentliche Triggerfunktion `set_dogsports_server_updated_at`, `SECURITY INVOKER`, leerer `search_path`; keine öffentliche `SECURITY DEFINER`-Anwendungsfunktion oder View festgestellt. Keine Storage-Buckets oder Edge Functions vorhanden. |
| Dateien → Browser | Nur JSON-Import, JSON-/CSV-Export. Backup v1/Legacy-Appname und v3 werden weiterhin verarbeitet. CSV ist kein unterstütztes Importformat. Dateiendung/MIME sind lediglich Auswahlhilfen, die Sicherheit kommt aus Inhaltsschema und Größenprüfung. |
| Fachregeln | THS-Ergebnisse, Qualifikationen, Bestleistungen und Statistiken werden lokal berechnet; digitaler THS-/IBGH-Richter ebenfalls lokal. Kein serverseitiges amtliches Ergebnis-/Freigabemodell vorhanden. Besitzer dürfen eigene Ergebnisse ändern; das ist kein IDOR. IBGH-Ergebnisse/Statistik sind Platzhalter, IFH ist im untersuchten Stand nicht aktiv. |
| Deployment | Vercel-Projekt `hashtag-dogsports`, Node 24, Vite. Inspiziertes Produktionsdeployment `dpl_6FyxTbLu8PtTYkj2pdQ11jDD9UA8`, Git-SHA wie oben. SSO-Schutz `all_except_custom_domains`; keine Passwort-/IP-Sperre. Keine Aussagen über tatsächlich ausgelieferte produktive Header ohne HTTP-Messung. |
| Variablen | Vercel enthält Browser-URL und Publishable Key für Supabase; kein Service-Role-/Secret-Key festgestellt. `VITE_MAPTILER_KEY` existiert, wird vom aktuellen Code nicht verwendet. Keine Entschlüsselung angefordert. `VITE_*` ist grundsätzlich öffentlich; eine verschlüsselte Dashboard-Darstellung macht eingebundene Werte nicht geheim. |
| CI/Supply Chain | GitHub Actions für push/pull_request, npm-Lockfile, Vitest, Oxlint, TypeScript-/Vite-Build. Keine Deployment-Jobs hinzugefügt. Action-SHAs wurden gegen Git-Tags verifiziert. |

## Bestätigte Befunde

Die Dateipositionen beziehen sich auf den korrigierten Stand bzw. die ausdrücklich genannte Basis. „Bestätigt“ betrifft den beschriebenen Defekt/die Konfiguration; es bedeutet keinen nachgewiesenen Angriff auf Produktion.

### DS-01 – CSV-/Formula-Injection – Medium – behoben

- **Position:** `src/data/backup.ts`, `toCsv`, insbesondere `cell` (Basis Zeile 188).
- **Ursache:** CSV-Quoting maskierte Trennzeichen/Anführungszeichen, aber keine Formelauswertung. Namen, Turniertitel und IDs mit `=`, `+`, `-`, `@` oder Steuerpräfixen blieben aktive Tabellenzellen.
- **Auswirkung/Voraussetzung:** Ein Nutzer importiert/erfasst entsprechende Daten, exportiert sie und öffnet die CSV in einem interpretierenden Tabellenprogramm. Formeln können abhängig vom Programm Aktionen oder externe Bezüge auslösen. Kein automatischer Browser-XSS-Nachweis.
- **Zuordnung:** CWE-1236, OWASP Injection.
- **Maßnahme/Nachweis:** Gefährliche Präfixe erhalten ein führendes Apostroph vor dem CSV-Quoting. BOM, Dezimalkomma, Semikolon und normale Texte bleiben erhalten. Parametrisierte Regressionstests und tatsächlicher Browser-Download erfolgreich. Nachweisstatus: bestätigt.

### DS-02 – Persistierbare ungültige Backup-/Cloud-Daten – Medium – behoben

- **Position:** `src/data/backup.ts:64`, `src/data/cloudSync.ts:24`, `src/App.tsx:123`.
- **Ursache:** Nur Teilfelder wurden geprüft. Beispielsweise Objektwerte in `notes`, ungültige Zahlen-/Datums-/Metadaten oder fehlerhafte optionale Laufdaten konnten persistiert werden; danach konnten Rendering, Sortierung oder Sync ausfallen. Doppelte IDs innerhalb einer Datei waren mehrdeutig.
- **Auswirkung/Voraussetzung:** Import einer manipulierten Datei oder eigener beschädigter Cloud-Daten; dauerhafte Störung des lokalen Datenbestands/der Anzeige. Keine kontenübergreifende Schreibberechtigung daraus abgeleitet.
- **Zuordnung:** CWE-20, CWE-248; OWASP Injection/Input Validation.
- **Maßnahme/Nachweis:** Strukturprüfung aller verarbeiteten Ergebnisfelder und Profilmetadaten, endliche Zahlen, gültige Kalenderdaten, erlaubte Enum-Werte, eindeutige IDs je Entitätsart. Fehlende fachliche Angaben/null bleiben als Entwurf zulässig. Leeres Datum wird als „–“ angezeigt. Legacy-Profile werden weiterhin erzeugt. Kontozugehörigkeit von API-Antworten wird zusätzlich geprüft. Malformed-Payload-, Roundtrip- und API-Tests erfolgreich. Nachweisstatus: bestätigt.

### DS-03 – Unbegrenzte Import-Ressourcen – Low – behoben

- **Position:** `src/data/backup.ts:59`, `src/data/validation.ts:2`, Import in `src/App.tsx`.
- **Ursache:** `File.text()` und JSON-Parsing ohne vorangestellte Größenprüfung; Detailarrays und Legacy-Profilzuordnung konnten erheblichen CPU-/Speicherverbrauch verursachen.
- **Auswirkung/Voraussetzung:** Nutzer öffnet eine große/manipulierte lokale Datei; Browser-Tab kann blockieren. Kein unautorisierter netzwerkweiter DoS-Pfad.
- **Zuordnung:** CWE-400, OWASP API4 Resource Consumption (analoge lokale Grenze).
- **Maßnahme/Nachweis:** 20 MiB vor Datei-Lesen sowie vor JSON-Parsing, maximal 20.000 eingehende Entitäten, 1.000 Fehlerdetails je Lauf. Namens-/ID-Lookups und Konfliktzählung verwenden Maps/Sets. Größere Archive müssen aufgeteilt werden; bestehende gespeicherte Daten werden nicht gelöscht. Tests bestätigen Ablehnung vor `text()` und kontrollierte Grenzen. Nachweisstatus: bestätigt.

### DS-04 – Import überschreibt zwischenzeitliche Änderungen – Medium – behoben

- **Position:** Basis `src/App.tsx:632–652`, neu `src/data/db.ts:383` (`importBackup`).
- **Ursache:** Gesamte UI-Snapshots wurden mit Importdaten zusammengeführt und per `bulkPut` zurückgeschrieben, einschließlich unveränderter Datensätze. Zwischenzeitliche Änderungen aus anderem Tab/Sync konnten dadurch verloren gehen.
- **Auswirkung/Voraussetzung:** Import und konkurrierende lokale Änderung; Integritätsverlust im eigenen Konto, auch bei nicht betroffenen IDs.
- **Zuordnung:** CWE-362 / CWE-367.
- **Maßnahme/Nachweis:** Aktuelle Daten innerhalb einer gemeinsamen IndexedDB-Schreibtransaktion lesen, Konflikte dort auflösen, ausschließlich angenommene Importdatensätze schreiben/queuen. Konflikte werden standardmäßig übersprungen, Ersetzen bleibt explizit. Regressionstest schützt aktuelle Datensätze und deren Warteschlangeneinträge. Nachweisstatus: bestätigt.

### DS-05 – Vermeidbare Cloud-/Queue-Schreibkonflikte – Medium – behoben mit Grenzen

- **Position:** `src/data/cloudSync.ts:114`, `src/data/db.ts:458` und `removeQueueChangesIfUnchanged`.
- **Ursache:** Unbedingtes Upsert nach einem früheren Read konnte eine inzwischen neuere Serverversion überschreiben. Queue-Bestätigungen verglichen nur Zeitstempel und Operation; zwei Änderungen in derselben Millisekunde konnten verwechselt werden.
- **Auswirkung/Voraussetzung:** Zwei Geräte/Tabs schreiben gleichzeitig. Eigene Ergebnisse/Änderungen gehen verloren; keine fremden Kontorechte erforderlich oder gewonnen.
- **Zuordnung:** CWE-362.
- **Maßnahme/Nachweis:** UPDATE filtert atomar auf Besitzer, Entität, ID und zuvor gelesenen `server_updated_at`; neue Datensätze verwenden INSERT, keine Konfliktüberschreibung. Null aktualisierte Zeilen führen zu einem Fehler mit erhaltener Queue. Queue-Bestätigungen vergleichen zusätzlich den Payload. Downloads lassen gleich alte/neue lokale Queue-Einträge bestehen. Stabile Sortierung nach Entität/ID statt sich ändernder Update-Zeit. API-Transport-/IndexedDB-Regressionen erfolgreich. Nachweisstatus: bestätigt.
- **Grenzen:** Das bestehende Last-Writer-Wins-Modell nach Clientzeit bleibt erhalten. Kein universelles Versionsarchiv, kein atomarer Sync über mehrere Datensätze und kein transaktionaler Snapshot über mehrere API-Seiten. Alte Clients/direkte API-Schreiber verwenden weiterhin ihre bisherigen Schreibwege. Bedingte Einzelrequests erhöhen die Requestanzahl; bei Teilfehlern bleiben Wiederholungen möglich. Ein serverseitiger Versions-/Konfliktmechanismus wäre eine gesondert freizugebende Migration.

### DS-06 – Verwundbare Entwicklungsabhängigkeiten – Medium im Anwendungskontext – teilweise behoben

- **Position:** `package.json`, `package-lock.json`, `.github/workflows/ci.yml`.
- **Ursache/Auswirkung/Voraussetzung:** Bekannte Advisories in Test-/Build-Werkzeugen; Ausnutzung setzt je nach Advisory einen erreichbaren Mock-Server, kontrollierte Mock-/Glob-/Merge-Eingaben oder bereits vorhandene Prototype Pollution voraus. Keine dieser Bibliotheken wurde als produktiver API-Handler festgestellt. Installierte betroffene Versionen sind bestätigt, tatsächliche Ausnutzbarkeit der verbleibenden Build-Pfade ist nicht verifiziert.
- **Zuordnung:** CWE-22/94/1321/400/405/79; OWASP Vulnerable and Outdated Components.
- **Maßnahme:** Gezielter, getesteter Wechsel Vitest **3.2.7 → 4.1.12** entfernt Tinypool und aktualisiert Mocker. Dies ist ein bewusst begrenztes Dev-Tool-Major-Update, kein `audit fix --force`. `serialize-javascript` **7.1.2 → 7.1.4**. `vite-plugin-pwa` bleibt **1.3.0**, nun exakt gepinnt; Supabase JS bleibt **2.119.0**, nun exakt gepinnt. Lockfile aktualisiert. Vollständige Tests und PWA-Build erfolgreich.

| Advisory | Upstream-Risiko | Ergebnis |
| --- | --- | --- |
| [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) | Critical, Tinypool worker options / Prototype Pollution → RCE | Tinypool entfernt |
| [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) | Critical, Tinypool run options → RCE | Tinypool entfernt |
| [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) | Moderate, Vitest/Mocker Path Traversal | Mocker/Vitest 4.1.12 |
| [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) | Moderate, Mocker Code Injection | Mocker 4.1.12 |
| [GHSA-m5mm-p8h7-m29v](https://github.com/advisories/GHSA-m5mm-p8h7-m29v) | Low, serialize-javascript XSS | 7.1.4 |
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | Low, deepmerge Prototype Poisoning | Offen: 4.3.1, neueste abgefragte Version ebenfalls betroffen |
| [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) | Moderate, glob AbortSignal/resource consumption | Offen: Workbox verlangt glob ^11; Fix außerhalb dieses Major-Bereichs |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Moderate, minimatch amplification | Offen: glob 11 verwendet minimatch 10, Fix ab 11.0.1 |

Die sechs verbleibenden Paketmeldungen sind diese drei Advisories plus abhängige Paketknoten, keine sechs unabhängigen Exploits. Keine erzwungenen inkompatiblen Workbox-Overrides; auf kompatiblen Upstream-Fix prüfen. Build nur mit vertrauenswürdigen Konfigurationen, keine öffentlichen Vitest-/Vite-Entwicklungsserver.

### DS-07 – Überschüssige Tabellenrechte – Low – Freigabe erforderlich

- **Position:** `supabase/migrations/20261106120000_create_dogsports_records.sql:43–45`; live über `information_schema.role_table_grants` bestätigt.
- **Ursache:** GRANT von CRUD entfernt keine bereits über Default Privileges geerbten Rechte. `authenticated` besitzt zusätzlich `TRUNCATE`, `REFERENCES`, `TRIGGER`.
- **Auswirkung/Voraussetzung:** TRUNCATE unterliegt keiner zeilenweisen RLS-Prüfung; gefährlich bei zusätzlichem direktem SQL-/privilegiertem RPC-Ausführungspfad. Ein solcher öffentlich erreichbarer Pfad wurde hier nicht festgestellt. Deshalb Low statt behaupteter anonymer Massenlöschbarkeit.
- **Zuordnung:** CWE-250, OWASP Broken Access Control/Least Privilege.
- **Maßnahme/Nachweis:** Konkreten REVOKE siehe Freigabeabschnitt. Lokaler PGlite-Test reproduziert die Vererbung und bestätigt Entzug bei weiterhin vorhandenem UPDATE-Recht. Live nur lesend geprüft. Nachweisstatus: Konfiguration bestätigt, Remote-Exploit nicht verifiziert.

### DS-08 – Leaked Password Protection deaktiviert – Low – Freigabe erforderlich

- **Position:** Supabase Auth-Projektkonfiguration, Security Advisor `auth_leaked_password_protection`.
- **Ursache/Auswirkung/Voraussetzung:** Keine Sperre bereits bekannter kompromittierter Passwörter; relevant, wenn Nutzer solche Passwörter wählen/wiederverwenden. Keine kompromittierten Konten nachgewiesen.
- **Zuordnung:** CWE-521, OWASP Identification and Authentication Failures.
- **Maßnahme/Nachweis:** Aktivierung und mögliche Tarif-/Kompatibilitätsbedingungen prüfen, dann nach Freigabe aktivieren. Advisor-Befund bestätigt; keine Änderung vorgenommen. [Supabase-Anleitung](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### DS-09 – Bereits bestehende Migration entfernt alte IFH-Daten – Medium – Freigabe erforderlich

- **Position:** `src/data/db.ts:35–40`, `THSDatabase` Version 4, `ifhSessions: null`; vorhandener Test `removes the retired IFH store`.
- **Ursache:** Historischer Schemawechsel entfernt den IFH-Store bei Upgrade alter Installationen.
- **Auswirkung/Voraussetzung:** Eine noch auf Schema v2/v3 befindliche Installation mit IFH-Daten öffnet die aktuelle Anwendung. Der alte Store wird gelöscht. Der aktuelle aktive Funktionsumfang enthält kein IFH-Modul.
- **Zuordnung:** CWE-459 / Datenlebenszyklus und Integrität; kein Angreifer erforderlich.
- **Maßnahme/Nachweis:** Bestehender lokaler Migrationstest bestätigt das Verhalten. Nicht im Audit verändert, weil eine Korrektur/Archivierung einen Schema- und Datenlebenszykluswechsel erfordert. Vor Freigabe alte Installationen sichern, Archivierungskonzept und kompatible Migration entwerfen. Bereits gelöschte Daten lassen sich nur aus vorhandenen Sicherungen wiederherstellen; keine pauschale Wiederherstellung versprochen.

## Zusätzliche Härtungen und Prüfbeobachtungen

Diese Punkte sind nicht als weitere bestätigte Exploits gezählt:

- **H-01 Headers/CSP:** `vercel.json` setzt CSP mit Skripten nur von eigener Origin, exakt einer Supabase-HTTPS-Origin für Verbindungen, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri/form-action 'self'`, X-Frame-Options, nosniff, no-referrer und Permissions-Policy. Die Theme-Initialisierung liegt in `public/theme-init.js`, damit kein `unsafe-inline` für Skripte nötig ist. Inline-Styles bleiben wegen React/Recharts erlaubt. CSP wurde lokal mit dem Produktionsbundle getestet, nicht auf Vercel veröffentlicht. Bei künftig anderem Supabase-Projekt/zusätzlichen Diensten muss die Allowlist angepasst werden. Vercel-Preview-Toolbar ist nicht freigegeben.
- **H-02 CI/Secrets:** Actions auf geprüfte SHAs gepinnt, `contents: read`, Checkout ohne persistierte Credentials, Zeitlimit 15 Minuten, Node 24, `npm ci --ignore-scripts`, produktiver Dependency-Audit als CI-Gate. `.env*`/`.vercel` ignoriert, `.env.example` bleibt versioniert. Das einzige im Lockfile markierte Installationsskript betrifft optionales macOS-`fsevents`; Linux-Build und Tests funktionieren ohne Scripts. Vollständige Dev-Audit-Meldungen bleiben sichtbar im Bericht.
- **H-03 Speicherung/Datenschutz:** Abmeldung löscht bewusst keine lokalen Ergebnisse. Browser-/OS-Profilzugriff oder Same-Origin-Scriptausführung kann IndexedDB/Sessiondaten lesen; eine UI-Sperre ist keine Verschlüsselung. JSON/CSV-Exporte enthalten personenbezogene Daten im Klartext. Löschungen erzeugen Sync-Tombstones; endgültiges Löschen von Backups/Accountdaten und Aufbewahrungsfristen sind betriebliche Aufgaben. Keine rechtliche DSGVO-Konformität behauptet.
- **H-04 Auth-Konfiguration:** Mindestlänge in der UI ist keine serverseitige Passwortregel. SMTP, E-Mail-Bestätigung, CAPTCHA, Rate Limits, Redirect-Allowlist, JWT-Laufzeit, Recovery-Reauth und Sperr-/Löschprozesse konnten über die vorhandenen Verwaltungswerkzeuge nicht vollständig geprüft werden. Bestehende Access Tokens können bis Ablauf gültig bleiben; kein sofortiger Widerruf durch bloßes Löschen angenommen. Keine Änderung an Nutzerzugriffen ohne Freigabe.
- **H-05 Fachintegrität:** Keine amtliche Rangliste oder unabhängige Richterautorisierung vorhanden. Besitzer können eigene JSON-Payloads verändern. Berechnungen werden aus Eingabewerten neu bestimmt und keine importierte Qualifikation als vertrauenswürdiges Serverzertifikat behandelt. Neue serverseitige Validierungs-/Rollenregeln bedürfen eines geklärten Fachmodells und einer Migration.
- **H-06 Ressourcen/Sync:** Cloud-Gesamtabruf hat weiterhin keine harte Kontingentgrenze, kein Versionsarchiv und keinen Snapshot über Seiten. Für große Konten sind keyset pagination, Quoten und batchfähige bedingte Schreiboperationen separat zu planen. Ein defekter Alt-Cloud-Datensatz stoppt den Abgleich kontrolliert; er wird nicht still gelöscht.
- **H-07 Historische Secrets/Sinks:** Regex-Prüfung von 1.844.877 Bytes Git-Patches über die vorhandenen Branches auf Private Keys, Supabase Secret Keys, GitHub-Tokens und AWS Access Keys: keine Treffer. Kein vollständiger Secret-Scanner und keine Garantie für beliebige historische Secrets. Keine Nutzdaten oder Secret-Werte in Bericht/Tests aufgenommen. Keine Source Maps im geprüften Build, keine `.env`-/Source-/Testdateien im `dist`-Output.
- **H-08 Nicht vorhandene Pfade:** Keine eigene SQL-String-Konkatenation aus Benutzereingaben, Shell-Kommandos, Upload-Server, NoSQL-Schicht, URL-Proxy, fremde Redirect-Ziele oder cookieautorisierte eigene API gefunden. Daher keine pauschalen CSRF-/SSRF-/SQL-Injection-Behauptungen. Supabase REST wird parametrisiert über den Client genutzt; keine CORS-Wildcard mit Credentials im Repository konfiguriert.

## Durchgeführte Änderungen

| Dateien | Zweck |
| --- | --- |
| `src/data/validation.ts`, `src/data/backup.ts` | Schema-/Ressourcen-/ID-Prüfungen, CSV-Neutralisierung, kompatible Legacy-Profilübernahme |
| `src/App.tsx`, `src/data/db.ts` | Atomarer Import, nur angenommene Records schreiben, leere Datumsanzeige, Queue-Snapshot-Prüfung |
| `src/data/cloudSync.ts` | Bedingte Updates/INSERT, Besitzerprüfung, Profilmetadaten, stabile Sortierung |
| `vercel.json`, `index.html`, `public/theme-init.js` | Headers/CSP und kompatible Theme-Initialisierung; kein Audit-Branch-Deployment |
| `.github/workflows/ci.yml`, `.gitignore` | CI-Berechtigungen, SHA-Pins, Installations-/Secret-Härtung |
| `package.json`, `package-lock.json` | Gezielte Updates/Pins; ausschließlich für Tests neu: PGlite 0.5.15 und Playwright 1.65.0 |
| `src/data/security.test.ts`, `cloudSync.security.test.ts`, `rls.security.test.ts` | Neue Datei-/CSV-/Race-/API-/RLS-Regressionstests |
| `scripts/security-browser-check.mjs` | Wiederholbarer lokaler Browser-Flow mit Dummy-Key, synthetischer Sitzung, abgefangenen API-Requests und realer CSP |
| `docs/SECURITY_AUDIT.md` | Befunde, Nachweise, Grenzen und Freigabevorlagen |

`scoring.ts`, `judging.ts`, `ibghJudging.ts`, `disciplines.ts`, `results.ts`, `statistics.ts` und `resultAchievements.ts` sind gegenüber der Basis unverändert. Keine vorhandenen Datensätze oder produktiven DB-Schemata wurden geändert.

## Verifizierung

| Prüfung | Ergebnis/Evidenz |
| --- | --- |
| Vitest | **37 Testdateien, 291 Tests bestanden**; 44 neue Security-Tests zusätzlich zu den 247 Tests des UI-Basisstands. Der vorläufige main-Baseline-Lauf hatte 212 Tests. |
| Lint | `npm run lint` (Oxlint), erfolgreich ohne Warnungen |
| TypeScript + Produktionsbuild | `npm run build` führt `tsc -b` und Vite/PWA-Build aus; erfolgreich |
| Browser | `BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:browser:security`; echter Chromium, lokale Origin, Dummy-Publishable-Key, externe Requests abgefangen. Anmeldungssperre, synthetische Sitzung, JSON-Import, CSV-Download, THS/IBGH-Richter, Profile und Statistik erfolgreich; `CSP []`, `ERRORS []`. |
| API-Regressionen | Echter Supabase-JS-Client mit simuliertem Fetch: Fremdkonto-/Schema-Ablehnung, bedingtes UPDATE, Konfliktqueue, INSERT ohne Merge. Kein Aufruf der Produktiv-API. |
| DB-Integration | PGlite mit ausschließlich synthetischen UUIDs und der vorhandenen Migration: anon verweigert, eigene Rows lesbar/änderbar, fremde SELECT/UPDATE/DELETE und Owner-Reassignment verhindert; geerbtes TRUNCATE/Revoke lokal reproduziert. Kein vollständiger GoTrue/PostgREST-Servertest. |
| Dependencies | Vollständiger Audit: 6 Dev-Paketmeldungen / 3 Advisories offen. Produktionsaudit: 0. Kein „alles grün“-Claim für Dev-Abhängigkeiten. |
| Integrität | `git diff --check` erfolgreich; fachliche Berechnungsdateien unverändert; bestehende Fachtests bestanden |
| Artefakte | PWA-Build erzeugt statische Assets und Service Worker; keine Source Maps/Secrets/Testdateien im dist. Service-Worker-Lifecycle/offline install wird durch den Browser-Harness nicht geprüft (Service Workers dort bewusst blockiert). |

**Aufgetretene und behobene Prüfprobleme:** Der erste npm-Installationsversuch scheiterte am nicht schreibbaren Standardcache; eigener Workspace-Cache löste das Problem. `npm audit fix` scheiterte an einer Peer-Dependency-Auflösung mit vorgeschlagenem PWA-Downgrade; stattdessen gezielte Pins/Updates, kein `--force`. Der erste Build mit neuem DB-Test benötigte Node-Typreferenzen; korrigiert. Browser-Harness zunächst vor fertigem Build und anschließend mit falschem Accessible-Name-Selektor gestartet; korrigiert, vollständiger Lauf erfolgreich. Das waren keine verschwiegenen erfolgreichen Prüfungen.

**Nicht ausgeführte/verifizierbare Bereiche:** Produktiver Penetrationstest, echter E-Mail-/Passwort-Reset, Brute Force, Lasttest, sofortiger Tokenwiderruf, vollständige Auth-/Backup-/WAF-/GitHub-Branch-Protection-Konfiguration, Migration produktiver Daten und produktive HTTP-Header. Keine vollständige Funktionsbehauptung für das nicht vorhandene IFH-Modul oder IBGH-Platzhalter. Die Supabase-Changelog-URL wurde durch Netzwerkpolicy mit HTTP 403 blockiert; aktuelle Supabase-Dokumentation zu RLS/Filtern wurde über das Plugin konsultiert, die Client-Version blieb unverändert.

### Wiederholung

```sh
npm ci --ignore-scripts
npm run lint
npm test
npm run build
npm audit --omit=dev
npm audit
# Installiertes Chromium verwenden; alternativ Playwright-Chromium separat installieren.
BROWSER_EXECUTABLE=/usr/bin/chromium npm run test:browser:security
```

Der Browser-Harness baut selbst in ein temporäres Verzeichnis und verwendet keine echten Konten. Ein produktiver Test ist dadurch nicht autorisiert.

## Offene Maßnahmen und konkrete Freigaben

Die Vorgabe im Audit-Auftrag lautet: „Bei Änderungen mit Migrationsbedarf, möglichem Datenverlust oder Auswirkungen auf Benutzerzugriffe: Nicht automatisch durchführen.“ Daher wurden folgende Schritte ausschließlich vorbereitet:

1. **DS-07 – unnötige DB-Rechte entziehen.** Nach Freigabe eine neue additive Migration mit der Supabase CLI erzeugen; bestehende Migration nicht rückwirkend verändern. Inhalt:

   ```sql
   revoke truncate, references, trigger
     on table public.dogsports_records from authenticated;
   ```

   Erwartung: CRUD und RLS bleiben unverändert; direkte administrative Sonderzugriffe dieser Rolle verlieren diese drei Rechte. Vor Ausführung andere legitime SQL-Integrationen prüfen. Danach Rechte per `has_table_privilege` und CRUD/RLS in einer autorisierten Testumgebung prüfen, Advisors erneut lesen. Revoke lokal erfolgreich geprüft. Kein Datenlöschen durch diese Anweisung.

2. **DS-08 – Supabase Leaked Password Protection aktivieren.** Nach Freigabe Tarifverfügbarkeit und Auswirkungen auf neue/wechselnde Passwörter prüfen, aktivieren und mit ausschließlich autorisierten Testkonten verifizieren. Dazu serverseitige Mindestlänge, Bestätigungspflicht, Redirect-Allowlist, Rate Limits/CAPTCHA und JWT-Laufzeit gemeinsam prüfen. Keine bestehende Sitzung oder Passwortpolicy automatisch verändert.

3. **DS-09 – Legacy-IFH-Datenerhalt planen.** Noch alte Installationen vor Upgrade sichern. Vor einer Migration entscheiden, ob der alte IFH-Store unverändert archiviert oder exportiert werden soll. Aus historischen App-Versionen repräsentative Testdaten für v2/v3/v6 anlegen und Erhalt nachweisen. Kein Schema-Upgrade ohne diese Entscheidung; kein erfundener Wiederherstellungsnachweis.

4. **DS-06 – Upstream-Updates verfolgen.** Deepmerge/Workbox/Glob/Minimatch gezielt aktualisieren, sobald kompatible Fixes existieren, oder eine bewusst getestete Ablösung der Build-Kette beschließen. Keine pauschalen Overrides über inkompatible Major-Versionen zur bloßen Audit-Beruhigung.

5. **Betrieb:** Änderungen reviewen und erst in einem getrennt autorisierten Deployment ausrollen. Headerwirkung, echte Auth-Flows, Sync zwischen zwei Testgeräten, Preview-Trennung (Preview/Development verwenden derzeit dasselbe Supabase-Projekt), Aufbewahrung/Löschung und Secret-/Domainrestriktion des ungenutzten MapTiler-Keys prüfen. Ein späterer Produktionsrelease ist nicht Bestandteil dieses Auftrags.

## Freigabe und Veröffentlichung – 9. November 2026

Der Nutzer hat das Verwerfen alter IFH-Daten und das produktive Deployment der implementierten Sicherheitsupdates ausdrücklich freigegeben. DS-09 ist damit als akzeptiertes historisches Löschverhalten geschlossen; eine zusätzliche IFH-Archivmigration ist nicht erforderlich. DS-07 (Datenbankrechte) und DS-08 (Auth-Passwortschutz) bleiben separate offene Konfigurationsmaßnahmen. Diese Deployment-Freigabe betrifft die implementierten App-Updates.
