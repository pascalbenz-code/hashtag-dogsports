import { MonitorCog, Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import type { ThemePreference } from "../theme/theme";
import { Card } from "./ui/card";

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

export function ThemeSettings() {
  const { resolvedTheme } = useTheme();

  return (
    <>
      <div>
        <p className="eyebrow text-teal">#DOGSPORTS EINSTELLUNGEN</p>
        <h2>Darstellung</h2>
        <p className="mt-2 text-sm text-muted">
          Wähle die Darstellung der gesamten App. Deine Auswahl bleibt auf
          diesem Gerät gespeichert.
        </p>
      </div>
      <Card className="space-y-4">
        <ThemeSelector />
        <p className="theme-resolution" role="status">
          Aktive Darstellung: {resolvedTheme === "dark" ? "Dunkel" : "Hell"}
        </p>
      </Card>
    </>
  );
}
