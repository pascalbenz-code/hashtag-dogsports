import { useState } from "react";
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { CloudSyncController } from "../hooks/useCloudSync";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const formatSyncTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      }).format(new Date(value))
    : "Noch nicht synchronisiert";

function SyncState({ cloud }: { cloud: CloudSyncController }) {
  const icon =
    cloud.status === "syncing" ? (
      <LoaderCircle className="animate-spin" aria-hidden="true" />
    ) : cloud.status === "offline" ? (
      <CloudOff aria-hidden="true" />
    ) : cloud.status === "error" ? (
      <CloudOff aria-hidden="true" />
    ) : (
      <CheckCircle2 aria-hidden="true" />
    );
  const label =
    cloud.status === "syncing"
      ? "Synchronisierung läuft"
      : cloud.status === "offline"
        ? "Offline · späterer Abgleich"
        : cloud.status === "error"
          ? "Abgleich fehlgeschlagen"
          : cloud.pendingCount
            ? `${cloud.pendingCount} Änderung(en) warten`
            : "Cloud aktuell";
  return (
    <div className={`cloud-state ${cloud.status}`} role="status">
      {icon}
      <div>
        <strong>{label}</strong>
        <span>Letzter Abgleich: {formatSyncTime(cloud.lastSyncedAt)}</span>
      </div>
    </div>
  );
}

export function CloudSyncPanel({ cloud }: { cloud: CloudSyncController }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  if (!cloud.configured)
    return (
      <>
        <div>
          <p className="eyebrow text-teal">#DOGSPORTS CLOUD</p>
          <h2>Cloud-Sicherung</h2>
        </div>
        <Card className="cloud-notice">
          <CloudOff aria-hidden="true" />
          <div>
            <h3>Anmeldung derzeit nicht verfügbar</h3>
            <p>
              Die App bleibt gesperrt. In dieser Bereitstellung fehlen
              Supabase-Projekt-URL und veröffentlichbarer Schlüssel.
            </p>
          </div>
        </Card>
      </>
    );

  if (cloud.user && cloud.accessStatus !== "ready")
    return (
      <>
        <div>
          <p className="eyebrow text-teal">#DOGSPORTS KONTO</p>
          <h2>
            {cloud.accessStatus === "checking"
              ? "Kontozugriff wird vorbereitet"
              : "Kontozugriff gesperrt"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            Angemeldet als <strong>{cloud.user.email}</strong>
          </p>
        </div>
        <Card className="space-y-4">
          <div
            className={`cloud-state ${
              cloud.accessStatus === "blocked" ? "error" : "syncing"
            }`}
            role="status"
          >
            {cloud.accessStatus === "checking" ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <LockKeyhole aria-hidden="true" />
            )}
            <div>
              <strong>
                {cloud.accessStatus === "checking"
                  ? "Lokales Konto wird geprüft"
                  : "Diese Installation ist einem anderen Konto zugeordnet"}
              </strong>
              <span>Die Fachmodule bleiben bis zur Freigabe gesperrt.</span>
            </div>
          </div>
          {cloud.message ? (
            <p className="cloud-message error" role="alert">
              {cloud.message}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => void cloud.signOut()}
          >
            <LogOut aria-hidden="true" />
            Abmelden
          </Button>
        </Card>
      </>
    );

  if (cloud.user)
    return (
      <>
        <div>
          <p className="eyebrow text-teal">#DOGSPORTS CLOUD</p>
          <h2>Cloud-Sicherung</h2>
          <p className="mt-2 text-sm text-muted">
            Angemeldet als <strong>{cloud.user.email}</strong>
          </p>
        </div>
        <Card className="space-y-4">
          <SyncState cloud={cloud} />
          {cloud.message ? (
            <p className={`cloud-message ${cloud.status}`} role="status">
              {cloud.message}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              disabled={cloud.loading || cloud.status === "syncing" || !cloud.online}
              onClick={() => void cloud.syncNow()}
            >
              <RefreshCw aria-hidden="true" />
              Jetzt synchronisieren
            </Button>
            <Button type="button" variant="ghost" onClick={() => void cloud.signOut()}>
              <LogOut aria-hidden="true" />
              Abmelden
            </Button>
          </div>
        </Card>
        {cloud.recoveryMode ? (
          <Card>
            <h3>Neues Passwort festlegen</h3>
            <label className="field">
              <span>Neues Passwort</span>
              <input
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <Button
              className="mt-3 w-full"
              disabled={newPassword.length < 8}
              onClick={() => void cloud.updatePassword(newPassword)}
            >
              <LockKeyhole aria-hidden="true" />
              Passwort speichern
            </Button>
          </Card>
        ) : null}
        <Card className="cloud-security">
          <ShieldCheck aria-hidden="true" />
          <div>
            <h3>Offline-First und kontogetrennt</h3>
            <p>
              Eingaben werden zuerst auf diesem Gerät gespeichert. Supabase
              gleicht Ergebnisse sowie Hunde- und Hundeführerprofile anschließend
              verschlüsselt über HTTPS ab. Daten anderer Konten sind durch Row
              Level Security nicht lesbar.
            </p>
          </div>
        </Card>
      </>
    );

  return (
    <>
      <div>
        <p className="eyebrow text-teal">#DOGSPORTS CLOUD</p>
        <h2>Anmelden und App öffnen</h2>
        <p className="mt-2 text-sm text-muted">
          Nach erfolgreicher Anmeldung werden die Fachmodule freigeschaltet und
          deine Daten mit deinem persönlichen Konto synchronisiert.
        </p>
      </div>
      <Card>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void cloud.signIn(email.trim(), password);
          }}
        >
          <label className="field mt-0">
            <span>E-Mail-Adresse</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Passwort · mindestens 8 Zeichen</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {cloud.message ? (
            <p className="cloud-message" role="status">
              {cloud.message}
            </p>
          ) : null}
          <Button
            className="w-full"
            disabled={cloud.loading || !email.trim() || password.length < 8}
          >
            {cloud.loading ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Cloud aria-hidden="true" />
            )}
            Anmelden
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={cloud.loading || !email.trim() || password.length < 8}
            onClick={() => void cloud.signUp(email.trim(), password)}
          >
            Konto erstellen
          </Button>
          <button
            type="button"
            className="cloud-text-button"
            disabled={!email.trim()}
            onClick={() => void cloud.sendPasswordReset(email.trim())}
          >
            Passwort vergessen?
          </button>
        </form>
      </Card>
      <Card className="cloud-security">
        <ShieldCheck aria-hidden="true" />
        <div>
          <h3>Persönlicher und geschützter Zugang</h3>
          <p>
            Ohne aktive Sitzung bleiben Navigation, Module, Profile und
            Leistungsdaten gesperrt. Nach einer früheren Anmeldung kann eine
            gültige gespeicherte Sitzung auch offline wiederhergestellt werden.
          </p>
        </div>
      </Card>
    </>
  );
}
