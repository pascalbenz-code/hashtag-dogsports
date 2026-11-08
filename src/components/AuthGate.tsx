import { LoaderCircle, LockKeyhole } from "lucide-react";
import type { CloudSyncController } from "../hooks/useCloudSync";
import { CloudSyncPanel } from "./CloudSyncPanel";
import { ThemeSelector } from "./ThemeSettings";
import { Card } from "./ui/card";

export function AuthGate({ cloud }: { cloud: CloudSyncController }) {
  const checkingSession = cloud.loading && !cloud.user;

  return (
    <div className="min-h-dvh pb-8">
      <header className="app-header">
        <div className="header-brand-button">
          <span className="brand">#Dogsports</span>
          <span className="crumb">Geschützter Zugang</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl space-y-5 px-4 py-5">
        <section className="hero-card" aria-label="#Dogsports">
          <img
            className="hero-banner"
            src="/dogsports-banner.webp"
            alt="#Dogsports mit schwarzem Sporthund"
          />
        </section>
        {checkingSession ? (
          <Card className="cloud-notice" aria-live="polite">
            <LoaderCircle className="animate-spin" aria-hidden="true" />
            <div>
              <h2>Anmeldung wird geprüft</h2>
              <p>
                Deine gespeicherte Sitzung wird sicher wiederhergestellt. Die
                App bleibt bis zum Abschluss gesperrt.
              </p>
            </div>
          </Card>
        ) : (
          <CloudSyncPanel cloud={cloud} />
        )}
        <Card className="cloud-security">
          <LockKeyhole aria-hidden="true" />
          <div>
            <h3>Zugriff nur mit Anmeldung</h3>
            <p>
              Module, Profile und Leistungsdaten werden erst nach einer
              bestätigten Anmeldung geladen. Lokale Daten bleiben bei einer
              Abmeldung erhalten, sind dann aber nicht in der App zugänglich.
            </p>
          </div>
        </Card>
        <Card className="space-y-3">
          <ThemeSelector />
          <p className="text-sm text-muted">
            Die Darstellung kann bereits vor der Anmeldung geändert werden und
            bleibt auf diesem Gerät gespeichert.
          </p>
        </Card>
      </main>
    </div>
  );
}
