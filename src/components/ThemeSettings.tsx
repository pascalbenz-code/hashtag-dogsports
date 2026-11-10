import { MonitorCog, Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import type { ThemePreference } from "../theme/theme";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { InviteFriendsButton } from "./InviteFriendsButton";
import { DASHBOARD_MODULES } from "../domain/dashboardPreferences";
import type { SportModule } from "../domain/appNavigation";

const options: ReadonlyArray<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: "system",
    label: "System",
    description: "Geräteeinstellung übernehmen",
    icon: MonitorCog,
  },
  {
    value: "light",
    label: "Hell",
    description: "Helle Darstellung verwenden",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dunkel",
    description: "Dunkle Darstellung verwenden",
    icon: Moon,
  },
];

export function ThemeSelector() {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="theme-selector">
      <legend className="label">Darstellung</legend>
      <div className="theme-options">
        {options.map((option) => {
          const Icon = option.icon;
          const active = option.value === preference;
          return (
            <button
              type="button"
              className={`theme-option ${active ? "active" : ""}`}
              aria-pressed={active}
              onClick={() => setPreference(option.value)}
              key={option.value}
            >
              <Icon aria-hidden="true" />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ThemeSettings({
  hiddenModules,
  configureModules,
  preferenceError,
  userCode,
  identifierError,
}: {
  hiddenModules: SportModule[];
  configureModules: (next: SportModule[]) => void;
  preferenceError: string;
  userCode?: string;
  identifierError: string;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <>
      <div>
        <p className="eyebrow text-teal">#DOGSPORTS EINSTELLUNGEN</p>
        <h2>App-Einstellungen</h2>
        <p className="mt-2 text-sm text-muted">
          Wähle die Darstellung der gesamten App. Deine Auswahl bleibt auf
          diesem Gerät gespeichert.
        </p>
      </div>
      <Card className="space-y-4">
        <h3>Dashboard konfigurieren</h3>
        <p className="text-sm text-muted">
          Welche Module sollen auf deiner Startseite erscheinen? Die Auswahl
          gilt für dein Konto auf diesem Gerät. Standard: alle Module.
        </p>
        {DASHBOARD_MODULES.map((m) => (
          <label
            key={m.id}
            className="flex items-center gap-3 rounded-xl border p-3"
          >
            <input
              type="checkbox"
              checked={!hiddenModules.includes(m.id)}
              onChange={(e) =>
                configureModules(
                  e.target.checked
                    ? hiddenModules.filter((id) => id !== m.id)
                    : [...hiddenModules, m.id],
                )
              }
            />
            <span>{m.label} anzeigen</span>
          </label>
        ))}
        <Button variant="secondary" onClick={() => configureModules([])}>
          Alle Module anzeigen
        </Button>
        {preferenceError ? <p role="alert">{preferenceError}</p> : null}
      </Card>
      <Card className="space-y-4">
        <ThemeSelector />
        <p className="theme-resolution" role="status">
          Aktive Darstellung: {resolvedTheme === "dark" ? "Dunkel" : "Hell"}
        </p>
      </Card>
      <Card className="space-y-3">
        <h3>Dein Konto</h3>
        <p>
          User-ID:{" "}
          <strong>{userCode ?? "Wird bei Cloud-Verbindung geladen …"}</strong>
        </p>
        {identifierError ? <p role="alert">{identifierError}</p> : null}
        <InviteFriendsButton />
      </Card>
    </>
  );
}
