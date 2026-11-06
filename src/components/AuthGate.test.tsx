import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CloudSyncController } from "../hooks/useCloudSync";
import { AuthGate } from "./AuthGate";

const controller = (
  overrides: Partial<CloudSyncController> = {},
): CloudSyncController => ({
  configured: true,
  user: null,
  loading: false,
  accessStatus: "signed-out",
  online: true,
  status: "idle",
  pendingCount: 0,
  lastSyncedAt: null,
  message: "",
  recoveryMode: false,
  syncNow: vi.fn(async () => null),
  signIn: vi.fn(async () => true),
  signUp: vi.fn(async () => true),
  signOut: vi.fn(async () => undefined),
  sendPasswordReset: vi.fn(async () => true),
  updatePassword: vi.fn(async () => true),
  clearMessage: vi.fn(),
  ...overrides,
});

describe("AuthGate", () => {
  it("shows only a session check while the stored login is loading", () => {
    const html = renderToStaticMarkup(
      <AuthGate cloud={controller({ loading: true })} />,
    );
    expect(html).toContain("Anmeldung wird geprüft");
    expect(html).toContain("App bleibt bis zum Abschluss gesperrt");
    expect(html).not.toContain("Konto erstellen");
  });

  it("shows the account controls but no application navigation when signed out", () => {
    const html = renderToStaticMarkup(<AuthGate cloud={controller()} />);
    expect(html).toContain("Anmelden und App öffnen");
    expect(html).toContain("Konto erstellen");
    expect(html).toContain("Zugriff nur mit Anmeldung");
    expect(html).not.toContain("Digitaler Leistungsrichter");
    expect(html).not.toContain("Neuer Eintrag");
  });
});
