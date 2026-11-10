import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "./ui/button";
export const INVITE_URL = "https://hashtag-dogsports.vercel.app";
export function InviteFriendsButton() {
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setMessage("");
          setBusy(true);
          try {
            if (navigator.share) {
              await navigator.share({
                title: "#Dogsports",
                text: "Trainiere mit uns! Erfasse deine Hundesport-Ergebnisse und verbinde dich mit deinem Verein auf #Dogsports.",
                url: INVITE_URL,
              });
              setMessage("Einladung an das Teilen-Menü übergeben.");
            } else if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(INVITE_URL);
              setMessage(
                "Einladungslink kopiert. Du kannst ihn jetzt versenden.",
              );
            } else {
              setFallback(true);
              setMessage("Kopiere den Link und versende ihn an deine Freunde.");
            }
          } catch (error) {
            if (!(error instanceof Error && error.name === "AbortError")) {
              setFallback(true);
              setMessage(
                "Teilen nicht verfügbar. Du kannst den Link manuell kopieren.",
              );
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        <Share2 size={18} /> Freunde zur App einladen
      </Button>
      {message ? (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
      {fallback ? (
        <label className="field">
          <span>Einladungslink</span>
          <input
            readOnly
            value={INVITE_URL}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
      ) : null}
    </div>
  );
}
