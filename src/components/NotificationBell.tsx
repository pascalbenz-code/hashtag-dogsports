import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  loadNotifications,
  markNotificationsRead,
  type CommunityNotification,
} from "../data/notifications";
import { Button } from "./ui/button";

export function NotificationBell({
  userId,
  openCommunity,
}: {
  userId: string;
  openCommunity: () => void;
}) {
  const [data, setData] = useState<{
    events: CommunityNotification[];
    unread: number;
    cursor: string;
  }>({ events: [], unread: 0, cursor: "1970-01-01T00:00:00Z" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    let active = true;
    loadNotifications(userId)
      .then((value) => {
        if (active) {
          setData(value);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("Benachrichtigungen derzeit nicht erreichbar.");
      });
    return () => {
      active = false;
    };
  }, [userId, revision]);
  useEffect(() => {
    const refreshVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(refreshVisible, 30000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("dogsports-community-changed", refreshVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("dogsports-community-changed", refreshVisible);
    };
  }, [refresh]);
  return (
    <>
      <button
        type="button"
        className="header-cloud-button notification-bell"
        aria-label={`Benachrichtigungen öffnen, ${data.unread} ungelesen`}
        onClick={() => {
          dialog.current?.showModal();
          refresh();
        }}
      >
        <Bell aria-hidden="true" />
        {data.unread ? (
          <span className="notification-count">
            {data.unread > 99 ? "99+" : data.unread}
          </span>
        ) : null}
      </button>
      <dialog
        ref={dialog}
        className="community-dialog"
        aria-labelledby="notifications-title"
      >
        <h2 id="notifications-title">Benachrichtigungen</h2>
        <p className="text-sm text-muted">
          Neuigkeiten aus deinen Vereinen. Aktualisierung alle 30 Sekunden,
          solange die App sichtbar ist.
        </p>
        {error ? <p role="alert">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={refresh}>
            Aktualisieren
          </Button>
          <Button
            size="sm"
            disabled={busy || !data.unread || !data.events.length}
            onClick={async () => {
              setBusy(true);
              try {
                await markNotificationsRead(userId, data.events[0].created_at);
                refresh();
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Lesestatus nicht gespeichert.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Alle als gelesen markieren
          </Button>
        </div>
        {!data.events.length ? (
          <p>
            Noch keine Neuigkeiten. Neue Beiträge und Beitritte anderer
            Mitglieder erscheinen hier ab deinem Vereinsbeitritt.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.events.map((n) => (
              <li key={n.id} className="rounded-xl border p-3">
                <p className="font-bold">
                  {n.dogsports_clubs.name}{" "}
                  {n.created_at > data.cursor ? "· Ungelesen" : ""}
                </p>
                <p>
                  {n.kind === "post_created"
                    ? "Ein neues Ergebnis wurde im Verein geteilt."
                    : "Ein neues Mitglied ist dem Verein beigetreten."}
                </p>
                <time className="text-sm text-muted" dateTime={n.created_at}>
                  {new Date(n.created_at).toLocaleString("de-DE")}
                </time>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    dialog.current?.close();
                    openCommunity();
                  }}
                >
                  Zum Vereinsfeed
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">
          Die letzten 50 Meldungen. Eigene Aktionen werden nicht gemeldet.
        </p>
        <Button variant="secondary" onClick={() => dialog.current?.close()}>
          Schließen
        </Button>
      </dialog>
    </>
  );
}
