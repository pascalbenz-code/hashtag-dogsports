import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { AuthChangeEvent, User } from "@supabase/supabase-js";
import { synchronizeCloud, type CloudSyncSummary } from "../data/cloudSync";
import { bindDatabaseToUser, db, SYNC_META_KEYS } from "../data/db";
import {
  isSupabaseConfigured,
  supabase,
} from "../lib/supabase";

export type CloudSyncStatus =
  | "local"
  | "offline"
  | "idle"
  | "syncing"
  | "synced"
  | "error";

export type AccountAccessStatus =
  | "signed-out"
  | "checking"
  | "ready"
  | "blocked";

export interface CloudSyncController {
  configured: boolean;
  user: User | null;
  loading: boolean;
  accessStatus: AccountAccessStatus;
  online: boolean;
  status: CloudSyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  message: string;
  recoveryMode: boolean;
  syncNow: () => Promise<CloudSyncSummary | null>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  clearMessage: () => void;
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Unbekannter Fehler";

export function useCloudSync(): CloudSyncController {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [accessStatus, setAccessStatus] =
    useState<AccountAccessStatus>("signed-out");
  const [online, setOnline] = useState(() => navigator.onLine);
  const [status, setStatus] = useState<CloudSyncStatus>(
    isSupabaseConfigured ? "idle" : "local",
  );
  const [message, setMessage] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const sessionUserId = useRef<string | null>(null);
  const syncPromise = useRef<Promise<CloudSyncSummary | null> | null>(null);
  const pendingCount = useLiveQuery(() => db.syncQueue.count(), []) ?? 0;
  const lastSyncedAt =
    useLiveQuery(
      async () =>
        (await db.syncMeta.get(SYNC_META_KEYS.lastSyncedAt))?.value ?? null,
      [],
    ) ?? null;
  const userId = user?.id ?? null;

  const syncNow = useCallback(async () => {
    if (!supabase || !user || accessStatus !== "ready") return null;
    if (!navigator.onLine) {
      setStatus("offline");
      setMessage(
        "Du bist offline. Änderungen bleiben sicher auf diesem Gerät und werden später synchronisiert.",
      );
      return null;
    }
    if (syncPromise.current) return syncPromise.current;
    setStatus("syncing");
    setMessage("");
    const operation = synchronizeCloud(supabase, user.id)
      .then((summary) => {
        setStatus("synced");
        setMessage(
          summary.uploaded || summary.downloaded
            ? `${summary.uploaded} Änderung(en) hochgeladen, ${summary.downloaded} heruntergeladen.`
            : "Alle Daten sind aktuell.",
        );
        return summary;
      })
      .catch((error: unknown) => {
        setStatus("error");
        setMessage(`Synchronisierung fehlgeschlagen: ${errorText(error)}`);
        return null;
      })
      .finally(() => {
        syncPromise.current = null;
      });
    syncPromise.current = operation;
    return operation;
  }, [accessStatus, user]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const updateSessionUser = (nextUser: User | null) => {
      const nextUserId = nextUser?.id ?? null;
      if (sessionUserId.current !== nextUserId)
        setAccessStatus(nextUser ? "checking" : "signed-out");
      sessionUserId.current = nextUserId;
      setUser(nextUser);
    };
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage(`Anmeldung konnte nicht geladen werden: ${error.message}`);
      updateSessionUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session) => {
        updateSessionUser(session?.user ?? null);
        setLoading(false);
        if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
        if (event === "SIGNED_OUT") {
          setStatus("idle");
          setRecoveryMode(false);
        }
      },
    );
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    void bindDatabaseToUser(userId)
      .then(() => {
        if (!active) return;
        setAccessStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAccessStatus("blocked");
        setStatus("error");
        setMessage(`Zugriff gesperrt: ${errorText(error)}`);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    const updateOnlineState = () => {
      const next = navigator.onLine;
      setOnline(next);
      if (!next && user && accessStatus === "ready") setStatus("offline");
      if (next && user && accessStatus === "ready") void syncNow();
    };
    const syncOnFocus = () => {
      if (
        document.visibilityState === "visible" &&
        user &&
        accessStatus === "ready"
      )
        void syncNow();
    };
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    document.addEventListener("visibilitychange", syncOnFocus);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
      document.removeEventListener("visibilitychange", syncOnFocus);
    };
  }, [accessStatus, syncNow, user]);

  useEffect(() => {
    if (!user || !online || accessStatus !== "ready") return;
    const start = window.setTimeout(() => void syncNow(), 0);
    const interval = window.setInterval(() => void syncNow(), 120_000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [accessStatus, online, syncNow, user]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return false;
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(`Anmeldung fehlgeschlagen: ${error.message}`);
      return false;
    }
    setMessage("Erfolgreich angemeldet. Die Synchronisierung startet.");
    return true;
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) return false;
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage(`Konto konnte nicht erstellt werden: ${error.message}`);
      return false;
    }
    setMessage(
      data.session
        ? "Konto erstellt. Die Synchronisierung startet."
        : "Konto erstellt. Bitte bestätige jetzt die E-Mail und melde dich danach an.",
    );
    return true;
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(`Abmeldung fehlgeschlagen: ${error.message}`);
    else
      setMessage(
        "Abgemeldet. Deine lokalen Daten bleiben auf diesem Gerät erhalten.",
      );
  };

  const sendPasswordReset = async (email: string) => {
    if (!supabase) return false;
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      setMessage(`E-Mail konnte nicht gesendet werden: ${error.message}`);
      return false;
    }
    setMessage("E-Mail zum Zurücksetzen des Passworts wurde gesendet.");
    return true;
  };

  const updatePassword = async (password: string) => {
    if (!supabase) return false;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(`Passwort konnte nicht geändert werden: ${error.message}`);
      return false;
    }
    setRecoveryMode(false);
    setMessage("Passwort wurde geändert.");
    return true;
  };

  return {
    configured: isSupabaseConfigured,
    user,
    loading,
    accessStatus,
    online,
    status,
    pendingCount,
    lastSyncedAt,
    message,
    recoveryMode,
    syncNow,
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    updatePassword,
    clearMessage: () => setMessage(""),
  };
}
