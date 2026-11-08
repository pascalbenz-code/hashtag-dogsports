import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import type { CloudSyncController } from "./hooks/useCloudSync";
import { ThemeProvider } from "./theme/ThemeProvider";

vi.mock("./hooks/useCloudSync", () => ({
  useCloudSync: vi.fn(),
}));

import App from "./App";
import { useCloudSync } from "./hooks/useCloudSync";

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

describe("App authentication gate", () => {
  beforeEach(() => {
    vi.mocked(useCloudSync).mockReturnValue(controller());
  });

  it("does not mount modules or navigation without a signed-in account", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider initialPreference="system">
        <App />
      </ThemeProvider>,
    );
    expect(html).toContain("Anmelden und App öffnen");
    expect(html).toContain("Geschützter Zugang");
    expect(html).not.toContain("Modul THS");
    expect(html).not.toContain("Digitaler Leistungsrichter");
    expect(html).not.toContain('aria-label="Navigation');
  });

  it("keeps the application locked during password recovery", () => {
    vi.mocked(useCloudSync).mockReturnValue(
      controller({
        user: { id: "user-1", email: "alex@example.de" } as User,
        accessStatus: "ready",
        recoveryMode: true,
      }),
    );
    const html = renderToStaticMarkup(
      <ThemeProvider initialPreference="system">
        <App />
      </ThemeProvider>,
    );
    expect(html).toContain("Neues Passwort festlegen");
    expect(html).not.toContain('aria-label="Navigation');
  });
});
