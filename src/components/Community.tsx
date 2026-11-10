import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Newspaper, Search, UsersRound } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { InviteFriendsButton } from './InviteFriendsButton';
import * as api from "../data/community";
import type { Club, ClubPost } from "../domain/community";
import { calculateScore } from "../domain/scoring";
import { CLASS_LABELS, isTimeResult } from "../domain/disciplines";
import type { CompetitionResult } from "../domain/types";

const date = (value: string) =>
  new Date(
    value.length === 10 ? `${value}T12:00:00` : value,
  ).toLocaleDateString("de-DE");
export function Community({
  userId,
  results,
  suggestedClubs,
}: {
  userId: string;
  results: CompetitionResult[];
  suggestedClubs: string[];
}) {
  const [tab, setTab] = useState<"feed" | "clubs">("feed");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [found, setFound] = useState<Club[]>([]);
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [selected, setSelected] = useState<Club | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [more, setMore] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [clubId, setClubId] = useState("");
  const [resultId, setResultId] = useState("");
  const [caption, setCaption] = useState("");
  const [consent, setConsent] = useState(false);
  const complete = useMemo(
    () =>
      results
        .filter((r) => calculateScore(r).complete)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [results],
  );
  const chosen = complete.find((r) => r.id === resultId);
  const member = selected ? clubs.some((c) => c.id === selected.id) : false;
  const ids = selected ? (member ? [selected.id] : []) : clubs.map((c) => c.id);
  const visiblePosts = posts.filter((p) => ids.includes(p.club_id));
  const refresh = useCallback(async () => {
    const memberships = await api.myMemberships(userId);
    const own = await api.myClubs(memberships.map((m) => m.club_id));
    setClubs(own);
    return own;
  }, [userId]);
  useEffect(() => {
    let active = true;
    api
      .myMemberships(userId)
      .then((m) => api.myClubs(m.map((v) => v.club_id)))
      .then((data) => {
        if (active) setClubs(data);
      })
      .catch(() => {
        if (active) setError("Community nicht erreichbar. Bitte erneut laden.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);
  const feedKey = ids.join(",");
  useEffect(() => {
    let active = true;
    api
      .loadFeed(feedKey ? feedKey.split(",") : [])
      .then((data) => {
        if (active) {
          setPosts(data);
          setMore(data.length === 20);
        }
      })
      .catch(() => {
        if (active)
          setError("Feed konnte nicht geladen werden. Bitte erneut laden.");
      });
    return () => {
      active = false;
    };
  }, [feedKey]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .searchClubs(search)
        .then((data) => {
          if (active) setFound(data);
        })
        .catch(() => {
          if (active) setError("Vereinssuche nicht erreichbar.");
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      active = false;
    };
  }, [search]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Aktion fehlgeschlagen. Bitte erneut versuchen.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reloadFeed() {
    const data = await api.loadFeed(ids);
    setPosts(data);
    setMore(data.length === 20);
  }
  return (
    <section className="space-y-4" data-no-app-swipe>
      <div>
        <p className="eyebrow text-teal">GEMEINSAM IM HUNDESPORT</p>
        <h1>Community</h1>
        <p className="text-muted mt-2">Deine Vereine. Eure Erfolge.</p>
      </div>
      <InviteFriendsButton />
      <nav className="flex flex-wrap gap-2" aria-label="Community">
        <Button
          variant={tab === "feed" ? "default" : "secondary"}
          onClick={() => {
            setTab("feed");
            setSelected(null);
          }}
        >
          <Newspaper size={18} /> Vereinsfeed
        </Button>
        <Button
          variant={tab === "clubs" ? "default" : "secondary"}
          onClick={() => {
            setTab("clubs");
            setSelected(null);
          }}
        >
          <Search size={18} /> Vereine entdecken
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await refresh();
              setFound(await api.searchClubs(search));
              await reloadFeed();
              setMessage("Community aktualisiert.");
            })
          }
        >
          Aktualisieren
        </Button>
      </nav>
      {error ? (
        <Card role="alert">
          <p>{error}</p>
          <p className="text-sm text-muted">
            Bestehende Leistungsdaten sind weiterhin in deinen Modulen
            verfügbar.
          </p>
        </Card>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {loading ? <p role="status">Vereine werden geladen …</p> : null}
      {selected ? (
        <Card className="space-y-3">
          <Button variant="ghost" onClick={() => setSelected(null)}>
            ← Zurück zur Übersicht
          </Button>
          <p className="eyebrow text-teal">
            VEREINSSEITE · OFFENE COMMUNITY-GRUPPE
          </p>
          <h2>{selected.name}</h2>
          <p className="text-sm text-muted">Vereins-ID: {selected.public_id}</p>
          <p>{selected.city || "Kein Ort angegeben"}</p>
          <p className="whitespace-pre-wrap break-words">
            {selected.description || "Noch keine Beschreibung."}
          </p>
          <p className="text-sm text-muted">
            In der App angelegte Gruppe; keine Bestätigung einer offiziellen
            Vereinsmitgliedschaft.
          </p>
          {member ? (
            <>
              <p>
                ✓ Du bist beigetreten. Beiträge sind nur für Mitglieder
                sichtbar.
              </p>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      "Verein verlassen? Deine in diesem Verein geteilten Beiträge werden entfernt. Deine privaten Ergebnisse bleiben erhalten.",
                    )
                  )
                    void run(async () => {
                      await api.leaveClub(selected.id, userId);
                      await refresh();
                      setMessage("Verein verlassen.");
                    });
                }}
              >
                Verein verlassen
              </Button>
            </>
          ) : (
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api.joinClub(selected.id, userId);
                  await refresh();
                  setMessage("Du bist dem Verein beigetreten.");
                })
              }
            >
              Verein beitreten
            </Button>
          )}
        </Card>
      ) : null}
      {tab === "clubs" && !selected ? (
        <>
          <Card className="space-y-3">
            <h2>Vereine suchen</h2>
            <label className="field">
              Vereinsname oder Vereins-ID
              <input
                type="search"
                maxLength={100}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Verein suchen …"
              />
            </label>
            {suggestedClubs.length ? (
              <div className="flex flex-wrap gap-2">
                {suggestedClubs.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="secondary"
                    onClick={() => setSearch(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            ) : null}
            <p className="text-sm text-muted">
              Bis zu 50 Treffer. Deine Profilangabe ist ein Suchvorschlag; der
              Beitritt erfolgt hier separat.
            </p>
            {found.length ? (
              found.map((c) => (
                <button
                  key={c.id}
                  className="community-club"
                  onClick={() => {
                    setSelected(c);
                    setTab("feed");
                  }}
                >
                  <Building2 aria-hidden="true" />
                  <span>
                    <strong>{c.name}</strong>
                    <small>{c.public_id}</small>
                    <small>
                      {c.city || "Ohne Ortsangabe"}
                      {clubs.some((m) => m.id === c.id) ? " · Beigetreten" : ""}
                    </small>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              ))
            ) : (
              <p>
                Keine passenden Vereine gefunden. Suche anders oder lege deinen
                Verein an.
              </p>
            )}
          </Card>
          <Card>
            <details>
              <summary className="cursor-pointer font-bold">
                Neuen Verein anlegen
              </summary>
              <form
                className="space-y-3 mt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    const id = await api.createClub(name, city, description);
                    const own = await refresh();
                    setSelected(own.find((c) => c.id === id) ?? null);
                    setTab("feed");
                    setName("");
                    setCity("");
                    setDescription("");
                    setMessage("Verein angelegt. Du bist das erste Mitglied.");
                  });
                }}
              >
                <label className="field">
                  Vereinsname
                  <input
                    required
                    minLength={3}
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="field">
                  Ort
                  <input
                    maxLength={100}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </label>
                <label className="field">
                  Beschreibung
                  <textarea
                    maxLength={1500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
                <p className="text-sm text-muted">
                  Name, Ort und Beschreibung sind für angemeldete Nutzer
                  sichtbar. Jeder kann der Gruppe beitreten.
                </p>
                <Button disabled={busy || name.trim().length < 3}>
                  Verein anlegen und beitreten
                </Button>
              </form>
            </details>
          </Card>
        </>
      ) : null}
      {tab === "feed" ? (
        <>
          {!selected ? (
            <Card className="space-y-3">
              <h2>Meine Vereine</h2>
              {clubs.length ? (
                clubs.map((c) => (
                  <button
                    key={c.id}
                    className="community-club"
                    onClick={() => setSelected(c)}
                  >
                    <UsersRound aria-hidden="true" />
                    <span>
                      <strong>{c.name}</strong>
                      <small>{c.public_id}</small>
                      <small>{c.city}</small>
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                ))
              ) : (
                <>
                  <p>
                    Finde deinen Verein und tausche Erfolge mit anderen
                    Mitgliedern aus.
                  </p>
                  <Button onClick={() => setTab("clubs")}>Verein finden</Button>
                </>
              )}
            </Card>
          ) : null}
          {clubs.length && (!selected || member) ? (
            <Card>
              <details>
                <summary className="cursor-pointer font-bold">
                  Ergebnis im Verein teilen
                </summary>
                <form
                  className="space-y-3 mt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      !chosen ||
                      !consent ||
                      !clubs.some((c) => c.id === clubId)
                    )
                      return;
                    void run(async () => {
                      await api.publishResult(clubId, userId, chosen, caption);
                      setCaption("");
                      setConsent(false);
                      setResultId("");
                      await reloadFeed();
                      setMessage(
                        "Ergebnis geteilt. Es ist für Mitglieder des gewählten Vereins sichtbar.",
                      );
                    });
                  }}
                >
                  <label className="field">
                    Verein
                    <select
                      aria-label="Verein"
                      required
                      value={clubId}
                      onChange={(e) => {
                        setClubId(e.target.value);
                        setConsent(false);
                      }}
                    >
                      <option value="">Bitte auswählen</option>
                      {clubs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Vollständiges Ergebnis
                    <select
                      aria-label="Vollständiges Ergebnis"
                      required
                      value={resultId}
                      onChange={(e) => {
                        setResultId(e.target.value);
                        setConsent(false);
                      }}
                    >
                      <option value="">Bitte auswählen</option>
                      {complete.map((r) => (
                        <option key={r.id} value={r.id}>
                          {date(r.date)} · {r.event} · {r.dog}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!complete.length ? (
                    <p>
                      Erfasse zuerst ein vollständiges THS-Ergebnis.
                      IBGH-Ergebnisse werden bislang nicht gespeichert.
                    </p>
                  ) : null}
                  {chosen ? (
                    <p className="rounded-xl border p-3 break-words">
                      {chosen.handler} mit {chosen.dog} · {chosen.event} ·{" "}
                      {date(chosen.date)} · {CLASS_LABELS[chosen.className]} ·{" "}
                      {calculateScore(chosen).total?.toLocaleString("de-DE")}{" "}
                      {isTimeResult(chosen.className) ? "Sekunden" : "Punkte"}
                    </p>
                  ) : null}
                  <label className="field">
                    Dein Beitrag (optional)
                    <textarea
                      maxLength={1000}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    />
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      Ich möchte diese Zusammenfassung mit allen aktuellen und
                      künftigen Mitgliedern des gewählten Vereins teilen und
                      darf die genannten Personen veröffentlichen.
                    </span>
                  </label>
                  <p className="text-sm text-muted">
                    Geteilt wird der angezeigte Stand. Spätere Änderungen am
                    privaten Ergebnis aktualisieren den Beitrag nicht. Du kannst
                    ihn zurückziehen und erneut teilen.
                  </p>
                  <Button disabled={busy || !chosen || !consent || !clubId}>
                    Im Vereinsfeed veröffentlichen
                  </Button>
                </form>
              </details>
            </Card>
          ) : null}
          {!selected || member ? (
            <div className="space-y-4">
              <h2>
                {selected ? "Vereinsfeed" : "Neuigkeiten aus deinen Vereinen"}
              </h2>
              {!visiblePosts.length ? (
                <Card>
                  Noch keine geteilten Ergebnisse. Mitglieder entscheiden
                  selbst, welche Erfolge sie teilen.
                </Card>
              ) : (
                visiblePosts.map((p) => (
                  <Card key={p.id} className="space-y-3 min-w-0 break-words">
                    <p className="eyebrow text-teal">
                      {clubs.find((c) => c.id === p.club_id)?.name}
                    </p>
                    <h3>
                      {p.author_name} mit {p.dog_name}
                    </h3>
                    <p className="text-sm text-muted">
                      Geteilt am {date(p.created_at)} · Nur Vereinsmitglieder
                    </p>
                    <div className="rounded-xl border p-4">
                      <p>
                        {CLASS_LABELS[p.discipline]} · {p.event_name}
                      </p>
                      <p className="text-2xl font-black">
                        {Number(p.total).toLocaleString("de-DE", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {isTimeResult(p.discipline) ? "Sekunden" : "Punkte"}
                      </p>
                      <p className="text-sm">
                        Ergebnis vom {date(p.result_date)}
                      </p>
                    </div>
                    {p.caption ? (
                      <p className="whitespace-pre-wrap">{p.caption}</p>
                    ) : null}
                    <p className="text-xs text-muted">
                      Vom Mitglied geteilte Ergebniszusammenfassung.
                    </p>
                    {p.user_id === userId ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              "Diesen Beitrag aus dem Vereinsfeed zurückziehen?",
                            )
                          )
                            void run(async () => {
                              await api.withdrawPost(p.id, userId);
                              await reloadFeed();
                              setMessage("Beitrag zurückgezogen.");
                            });
                        }}
                      >
                        Beitrag zurückziehen
                      </Button>
                    ) : null}
                  </Card>
                ))
              )}
              {more && visiblePosts.length ? (
                <Button
                  disabled={busy}
                  variant="secondary"
                  onClick={() =>
                    void run(async () => {
                      const next = await api.loadFeed(ids, visiblePosts.length);
                      setPosts((old) => [
                        ...old,
                        ...next.filter((n) => !old.some((p) => p.id === n.id)),
                      ]);
                      setMore(next.length === 20);
                    })
                  }
                >
                  Weitere Beiträge laden
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
