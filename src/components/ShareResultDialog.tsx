import { useEffect, useRef, useState } from "react";
import type { CompetitionResult } from "../domain/types";
import type { Club } from "../domain/community";
import { myMemberships, myClubs, publishResult } from "../data/community";
import { calculateScore } from "../domain/scoring";
import { CLASS_LABELS, isTimeResult } from "../domain/disciplines";
import { Button } from "./ui/button";

export function ShareResultDialog({
  result,
  userId,
  close,
  openCommunity,
}: {
  result: CompetitionResult;
  userId: string;
  close: () => void;
  openCommunity: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const score = calculateScore(result);
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    myMemberships(userId)
      .then((m) => myClubs(m.map((x) => x.club_id)))
      .then((data) => {
        if (active) {
          setClubs(data);
          setClubId(data.length === 1 ? data[0].id : "");
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Vereine konnten nicht geladen werden. Bitte erneut öffnen.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);
  return (
    <dialog
      ref={dialog}
      className="community-dialog"
      aria-labelledby="share-result-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <h2 id="share-result-title">Im Verein teilen</h2>
      {success ? (
        <>
          <p role="status">
            Dein Ergebnis wurde im Vereinsfeed veröffentlicht.
          </p>
          <Button onClick={close}>Fertig</Button>
        </>
      ) : (
        <>
          <p>
            {result.handler} mit {result.dog}
          </p>
          <p>
            {result.event} · {CLASS_LABELS[result.className]}
          </p>
          <p className="text-2xl font-black">
            {score.total?.toLocaleString("de-DE", { maximumFractionDigits: 2 })}{" "}
            {isTimeResult(result.className) ? "Sekunden" : "Punkte"}
          </p>
          {loading ? (
            <p role="status">Vereine werden geladen …</p>
          ) : clubs.length ? (
            <label className="field">
              <span>Verein</span>
              <select
                aria-label="Verein zum Teilen"
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
              >
                <option value="">Bitte auswählen</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <p>Du bist noch keinem Verein beigetreten.</p>
              <Button variant="secondary" onClick={openCommunity}>
                Verein finden
              </Button>
            </>
          )}
          <p className="text-sm text-muted">
            Mit „Jetzt teilen“ veröffentlichst du diese Zusammenfassung für
            aktuelle und künftige Mitglieder des gewählten Vereins. Bitte teile
            nur Personen, deren Angaben du veröffentlichen darfst. Spätere
            Änderungen am Ergebnis aktualisieren den Beitrag nicht.
          </p>
          {error ? <p role="alert">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy} onClick={close}>
              Abbrechen
            </Button>
            <Button
              disabled={loading || busy || !clubId || !score.complete}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                setError("");
                try {
                  await publishResult(clubId, userId, result, "");
                  setSuccess(true);
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Teilen fehlgeschlagen. Dein gespeichertes Ergebnis bleibt erhalten.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Wird geteilt …" : "Jetzt teilen"}
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
