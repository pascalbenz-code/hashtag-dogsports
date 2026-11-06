import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import type { CloudSyncController } from "../hooks/useCloudSync";
import { CloudSyncPanel } from "./CloudSyncPanel";

const controller = (
  overrides: Partial<CloudSyncController> = {},
): CloudSyncController => ({
  configured: true,
  user: null,
  loading: false,
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

describe("CloudSyncPanel", () => {
  it("keeps the local fallback explicit when cloud config is absent", () => {
    const html = renderToStaticMarkup(
      <CloudSyncPanel cloud={controller({ configured: false })} />,
    );
    expect(html).toContain("Noch nicht mit Supabase verbunden");
    expect(html).toContain("vollständig lokal");
  });

  it("renders sign-in, sign-up and password recovery controls", () => {
    const html = renderToStaticMarkup(
      <CloudSyncPanel cloud={controller()} />,
    );
    expect(html).toContain("Anmelden");
    expect(html).toContain("Konto erstellen");
    expect(html).toContain("Passwort vergessen?");
    expect(html).toContain('autoComplete="email"');
  });

  it("shows account, pending changes and last sync status", () => {
    const user = { id: "user-1", email: "alex@example.de" } as User;
    const html = renderToStaticMarkup(
      <CloudSyncPanel
        cloud={controller({
          user,
          status: "synced",
          pendingCount: 2,
          lastSyncedAt: "2026-11-06T12:00:00.000Z",
        })}
      />,
    );
    expect(html).toContain("alex@example.de");
    expect(html).toContain("2 Änderung(en) warten");
    expect(html).toContain("Jetzt synchronisieren");
    expect(html).toContain("Abmelden");
  });
});
