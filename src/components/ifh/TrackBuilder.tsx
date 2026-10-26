import { Plus, Trash2 } from "lucide-react";
import type {
  IfhAngle,
  IfhArticle,
  IfhCrossTrack,
  IfhLeg,
  IfhTrack,
  IfhTrackEvent,
} from "../../domain/ifhTypes";
import { LocaleNumberInput } from "../LocaleNumberInput";
import { Button } from "../ui/button";
import { TrackPreview } from "./TrackPreview";

const uid = () => crypto.randomUUID();
const articleEvaluation = (): IfhArticle["evaluation"] => ({
  result: "unrated",
  indication: "unrated",
  pointPosition: "unrated",
  relation: "unrated",
  confidence: null,
  unrestAvoidance: null,
  holdsPosition: null,
  help: "",
  restart: "unrated",
  mediaReference: "",
  note: "",
});

function NumberField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <LocaleNumberInput
        value={value}
        onValueChange={onChange}
        max={max}
        maxFractionDigits={1}
        placeholder="–"
        ariaLabel={label}
      />
    </label>
  );
}

export function TrackBuilder({
  title,
  track,
  onChange,
}: {
  title: string;
  track: IfhTrack;
  onChange: (track: IfhTrack) => void;
}) {
  const updateLeg = (id: string, patch: Partial<IfhLeg>) =>
    onChange({
      ...track,
      legs: track.legs.map((leg) =>
        leg.id === id ? { ...leg, ...patch } : leg,
      ),
    });
  const removeLeg = (id: string) =>
    onChange({
      ...track,
      legs: track.legs
        .filter((leg) => leg.id !== id)
        .map((leg, index) => ({ ...leg, order: index + 1 })),
      angles: track.angles.filter((angle) => angle.legId !== id),
      articles: track.articles.filter((article) => article.legId !== id),
      crossTracks: track.crossTracks.filter(
        (crossing) => crossing.legId !== id,
      ),
      events: track.events.filter((event) => event.legId !== id),
    });
  const addLeg = () =>
    onChange({
      ...track,
      legs: [
        ...track.legs,
        {
          id: uid(),
          order: track.legs.length + 1,
          lengthSteps: null,
          lengthMeters: null,
          ground: "Wiese",
          vegetation: "",
          direction: "",
          shape: "straight",
          semicircleRadiusMeters: null,
          semicircleDirection: null,
          notes: "",
        },
      ],
    });
  const addAngle = () => {
    const angle: IfhAngle = {
      id: uid(),
      legId: track.legs[0]?.id ?? "",
      positionSteps: null,
      direction: "left",
      degrees: 90,
      type: "right",
      evaluation: { result: "unrated", intensityAfter: "unrated", note: "" },
    };
    onChange({ ...track, angles: [...track.angles, angle] });
  };
  const addArticle = () => {
    const article: IfhArticle = {
      id: uid(),
      number: track.articles.length + 1,
      material: "",
      legId: track.legs[0]?.id ?? "",
      positionSteps: null,
      dimensionsCm: { length: null, width: null, height: null },
      evaluation: articleEvaluation(),
    };
    onChange({ ...track, articles: [...track.articles, article] });
  };
  const addCrossTrack = () => {
    const crossing: IfhCrossTrack = {
      id: uid(),
      legId: track.legs[0]?.id ?? "",
      positionSteps: null,
      crossingAngle: null,
      layer: "",
      evaluation: { result: "unrated", note: "" },
    };
    onChange({ ...track, crossTracks: [...track.crossTracks, crossing] });
  };
  const addEvent = () => {
    const event: IfhTrackEvent = {
      id: uid(),
      legId: track.legs[0]?.id ?? "",
      positionSteps: null,
      type: "terrain-change",
      note: "",
    };
    onChange({ ...track, events: [...track.events, event] });
  };
  const legOptions = track.legs.map((leg) => (
    <option value={leg.id} key={leg.id}>
      Schenkel {leg.order}
    </option>
  ));
  return (
    <section className="space-y-4">
      <div className="ifh-section-heading">
        <div>
          <p className="eyebrow text-teal">FÄHRTENAUFBAU</p>
          <h3>{title}</h3>
        </div>
      </div>
      <TrackPreview track={track} />
      <div className="ifh-summary-grid">
        <NumberField
          label="Geschätzte Schrittlänge (m)"
          value={track.estimatedStepLengthMeters}
          onChange={(value) =>
            onChange({ ...track, estimatedStepLengthMeters: value })
          }
          max={2}
        />
        <NumberField
          label="Gerader Nachgang (Schritte)"
          value={track.postLastArticleStraightSteps}
          onChange={(value) =>
            onChange({ ...track, postLastArticleStraightSteps: value })
          }
        />
      </div>
      <p className="text-xs text-muted">
        Meter und Schritte bleiben getrennte Messwerte. Eine Umrechnung wird nur
        als Schätzung mit der oben hinterlegten Schrittlänge angezeigt.
      </p>

      <details open className="ifh-details">
        <summary>Schenkel ({track.legs.length})</summary>
        <div className="space-y-3">
          {track.legs.map((leg) => (
            <div className="ifh-builder-row" key={leg.id}>
              <div className="ifh-row-title">
                <strong>Schenkel {leg.order}</strong>
                <button
                  type="button"
                  aria-label={`Schenkel ${leg.order} löschen`}
                  onClick={() => removeLeg(leg.id)}
                >
                  <Trash2 />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Schritte"
                  value={leg.lengthSteps}
                  onChange={(value) =>
                    updateLeg(leg.id, { lengthSteps: value })
                  }
                />
                <NumberField
                  label="Meter gemessen"
                  value={leg.lengthMeters}
                  onChange={(value) =>
                    updateLeg(leg.id, { lengthMeters: value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="field">
                  <span>Untergrund</span>
                  <select
                    value={leg.ground}
                    onChange={(event) =>
                      updateLeg(leg.id, {
                        ground: event.target.value as IfhLeg["ground"],
                      })
                    }
                  >
                    <option>Wiese</option>
                    <option>Acker</option>
                    <option>Waldboden</option>
                    <option>gemischt</option>
                    <option>sonstiges</option>
                  </select>
                </label>
                <label className="field">
                  <span>Form</span>
                  <select
                    value={leg.shape}
                    onChange={(event) =>
                      updateLeg(leg.id, {
                        shape: event.target.value as IfhLeg["shape"],
                      })
                    }
                  >
                    <option value="straight">Gerade</option>
                    <option value="semicircle">Halbkreis</option>
                  </select>
                </label>
              </div>
              {leg.shape === "semicircle" ? (
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="Radius (m)"
                    value={leg.semicircleRadiusMeters}
                    onChange={(value) =>
                      updateLeg(leg.id, { semicircleRadiusMeters: value })
                    }
                  />
                  <label className="field">
                    <span>Richtung</span>
                    <select
                      value={leg.semicircleDirection ?? ""}
                      onChange={(event) =>
                        updateLeg(leg.id, {
                          semicircleDirection: (event.target.value ||
                            null) as IfhLeg["semicircleDirection"],
                        })
                      }
                    >
                      <option value="">–</option>
                      <option value="left">Links</option>
                      <option value="right">Rechts</option>
                    </select>
                  </label>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <label className="field">
                  <span>Bewuchs</span>
                  <input
                    value={leg.vegetation}
                    onChange={(event) =>
                      updateLeg(leg.id, { vegetation: event.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>Richtung</span>
                  <input
                    value={leg.direction}
                    onChange={(event) =>
                      updateLeg(leg.id, { direction: event.target.value })
                    }
                  />
                </label>
              </div>
              <label className="field">
                <span>Besonderheiten</span>
                <textarea
                  value={leg.notes}
                  onChange={(event) =>
                    updateLeg(leg.id, { notes: event.target.value })
                  }
                />
              </label>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={addLeg}
          >
            <Plus />
            Schenkel hinzufügen
          </Button>
        </div>
      </details>

      <details className="ifh-details">
        <summary>Winkel ({track.angles.length})</summary>
        <div className="space-y-3">
          {track.angles.map((angle, index) => (
            <div className="ifh-builder-row" key={angle.id}>
              <div className="ifh-row-title">
                <strong>Winkel {index + 1}</strong>
                <button
                  type="button"
                  aria-label="Winkel löschen"
                  onClick={() =>
                    onChange({
                      ...track,
                      angles: track.angles.filter(
                        (item) => item.id !== angle.id,
                      ),
                    })
                  }
                >
                  <Trash2 />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="field">
                  <span>Schenkel</span>
                  <select
                    value={angle.legId}
                    onChange={(event) =>
                      onChange({
                        ...track,
                        angles: track.angles.map((item) =>
                          item.id === angle.id
                            ? { ...item, legId: event.target.value }
                            : item,
                        ),
                      })
                    }
                  >
                    {legOptions}
                  </select>
                </label>
                <NumberField
                  label="Position (Schritte)"
                  value={angle.positionSteps}
                  onChange={(value) =>
                    onChange({
                      ...track,
                      angles: track.angles.map((item) =>
                        item.id === angle.id
                          ? { ...item, positionSteps: value }
                          : item,
                      ),
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="field">
                  <span>Richtung</span>
                  <select
                    value={angle.direction}
                    onChange={(event) =>
                      onChange({
                        ...track,
                        angles: track.angles.map((item) =>
                          item.id === angle.id
                            ? {
                                ...item,
                                direction: event.target
                                  .value as IfhAngle["direction"],
                              }
                            : item,
                        ),
                      })
                    }
                  >
                    <option value="left">Links</option>
                    <option value="right">Rechts</option>
                  </select>
                </label>
                <NumberField
                  label="Winkelgrad"
                  value={angle.degrees}
                  onChange={(value) =>
                    onChange({
                      ...track,
                      angles: track.angles.map((item) =>
                        item.id === angle.id
                          ? {
                              ...item,
                              degrees: value,
                              type:
                                value !== null && value < 90
                                  ? "acute"
                                  : "right",
                            }
                          : item,
                      ),
                    })
                  }
                  max={180}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={!track.legs.length}
            onClick={addAngle}
          >
            <Plus />
            Winkel hinzufügen
          </Button>
        </div>
      </details>

      <details className="ifh-details">
        <summary>Gegenstände ({track.articles.length})</summary>
        <div className="space-y-3">
          {track.articles.map((article) => (
            <div className="ifh-builder-row" key={article.id}>
              <div className="ifh-row-title">
                <strong>Gegenstand {article.number}</strong>
                <button
                  type="button"
                  aria-label="Gegenstand löschen"
                  onClick={() =>
                    onChange({
                      ...track,
                      articles: track.articles
                        .filter((item) => item.id !== article.id)
                        .map((item, index) => ({ ...item, number: index + 1 })),
                    })
                  }
                >
                  <Trash2 />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="field">
                  <span>Material</span>
                  <input
                    value={article.material}
                    onChange={(event) =>
                      onChange({
                        ...track,
                        articles: track.articles.map((item) =>
                          item.id === article.id
                            ? { ...item, material: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Schenkel</span>
                  <select
                    value={article.legId}
                    onChange={(event) =>
                      onChange({
                        ...track,
                        articles: track.articles.map((item) =>
                          item.id === article.id
                            ? { ...item, legId: event.target.value }
                            : item,
                        ),
                      })
                    }
                  >
                    {legOptions}
                  </select>
                </label>
              </div>
              <NumberField
                label="Position auf Schenkel (Schritte)"
                value={article.positionSteps}
                onChange={(value) =>
                  onChange({
                    ...track,
                    articles: track.articles.map((item) =>
                      item.id === article.id
                        ? { ...item, positionSteps: value }
                        : item,
                    ),
                  })
                }
              />
              <div className="grid grid-cols-3 gap-2">
                <NumberField
                  label="Länge cm"
                  value={article.dimensionsCm.length}
                  onChange={(value) =>
                    onChange({
                      ...track,
                      articles: track.articles.map((item) =>
                        item.id === article.id
                          ? {
                              ...item,
                              dimensionsCm: {
                                ...item.dimensionsCm,
                                length: value,
                              },
                            }
                          : item,
                      ),
                    })
                  }
                />
                <NumberField
                  label="Breite cm"
                  value={article.dimensionsCm.width}
                  onChange={(value) =>
                    onChange({
                      ...track,
                      articles: track.articles.map((item) =>
                        item.id === article.id
                          ? {
                              ...item,
                              dimensionsCm: {
                                ...item.dimensionsCm,
                                width: value,
                              },
                            }
                          : item,
                      ),
                    })
                  }
                />
                <NumberField
                  label="Höhe cm"
                  value={article.dimensionsCm.height}
                  onChange={(value) =>
                    onChange({
                      ...track,
                      articles: track.articles.map((item) =>
                        item.id === article.id
                          ? {
                              ...item,
                              dimensionsCm: {
                                ...item.dimensionsCm,
                                height: value,
                              },
                            }
                          : item,
                      ),
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="field">
                  <span>In Tasche seit</span>
                  <input
                    type="datetime-local"
                    value={article.carriedFrom?.slice(0, 16) ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...track,
                        articles: track.articles.map((item) =>
                          item.id === article.id
                            ? {
                                ...item,
                                carriedFrom: event.target.value || undefined,
                              }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Gelegt um</span>
                  <input
                    type="datetime-local"
                    value={article.laidAt?.slice(0, 16) ?? ""}
                    onChange={(event) =>
                      onChange({
                        ...track,
                        articles: track.articles.map((item) =>
                          item.id === article.id
                            ? {
                                ...item,
                                laidAt: event.target.value || undefined,
                              }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={!track.legs.length}
            onClick={addArticle}
          >
            <Plus />
            Gegenstand hinzufügen
          </Button>
        </div>
      </details>

      <details className="ifh-details">
        <summary>Verleitungen ({track.crossTracks.length})</summary>
        <div className="space-y-3">
          {track.crossTracks.map((crossing, index) => (
            <div className="ifh-builder-row" key={crossing.id}>
              <div className="ifh-row-title">
                <strong>Verleitung {index + 1}</strong>
                <button
                  type="button"
                  aria-label="Verleitung löschen"
                  onClick={() =>
                    onChange({
                      ...track,
                      crossTracks: track.crossTracks.filter(
                        (item) => item.id !== crossing.id,
                      ),
                    })
                  }
                >
                  <Trash2 />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="field">
                  <span>Schenkel</span>
                  <select
                    value={crossing.legId}
                    onChange={(event) =>
                      onChange({
                        ...track,
                        crossTracks: track.crossTracks.map((item) =>
                          item.id === crossing.id
                            ? { ...item, legId: event.target.value }
                            : item,
                        ),
                      })
                    }
                  >
                    {legOptions}
                  </select>
                </label>
                <NumberField
                  label="Position"
                  value={crossing.positionSteps}
                  onChange={(value) =>
                    onChange({
                      ...track,
                      crossTracks: track.crossTracks.map((item) =>
                        item.id === crossing.id
                          ? { ...item, positionSteps: value }
                          : item,
                      ),
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Kreuzungswinkel"
                  value={crossing.crossingAngle}
                  onChange={(value) =>
                    onChange({
                      ...track,
                      crossTracks: track.crossTracks.map((item) =>
                        item.id === crossing.id
                          ? { ...item, crossingAngle: value }
                          : item,
                      ),
                    })
                  }
                  max={180}
                />
                <label className="field">
                  <span>Verleitungsleger</span>
                  <input
                    value={crossing.layer}
                    onChange={(event) =>
                      onChange({
                        ...track,
                        crossTracks: track.crossTracks.map((item) =>
                          item.id === crossing.id
                            ? { ...item, layer: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
              </div>
              <label className="field">
                <span>Tatsächliche Legezeit</span>
                <input
                  type="datetime-local"
                  value={crossing.laidAt?.slice(0, 16) ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...track,
                      crossTracks: track.crossTracks.map((item) =>
                        item.id === crossing.id
                          ? { ...item, laidAt: event.target.value || undefined }
                          : item,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={!track.legs.length}
            onClick={addCrossTrack}
          >
            <Plus />
            Verleitung hinzufügen
          </Button>
        </div>
      </details>

      <details className="ifh-details">
        <summary>Weitere Ereignisse ({track.events.length})</summary>
        <div className="space-y-3">
          {track.events.map((event, index) => (
            <div className="ifh-builder-row" key={event.id}>
              <div className="ifh-row-title">
                <strong>Ereignis {index + 1}</strong>
                <button
                  type="button"
                  aria-label="Ereignis löschen"
                  onClick={() =>
                    onChange({
                      ...track,
                      events: track.events.filter(
                        (item) => item.id !== event.id,
                      ),
                    })
                  }
                >
                  <Trash2 />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="field">
                  <span>Art</span>
                  <select
                    value={event.type}
                    onChange={(change) =>
                      onChange({
                        ...track,
                        events: track.events.map((item) =>
                          item.id === event.id
                            ? {
                                ...item,
                                type: change.target
                                  .value as IfhTrackEvent["type"],
                              }
                            : item,
                        ),
                      })
                    }
                  >
                    <option value="terrain-change">Geländewechsel</option>
                    <option value="road-crossing">Wegüberquerung</option>
                    <option value="distraction">Ablenkung</option>
                    <option value="aid">Trainingshilfe</option>
                    <option value="food">Futterstelle</option>
                  </select>
                </label>
                <label className="field">
                  <span>Schenkel</span>
                  <select
                    value={event.legId}
                    onChange={(change) =>
                      onChange({
                        ...track,
                        events: track.events.map((item) =>
                          item.id === event.id
                            ? { ...item, legId: change.target.value }
                            : item,
                        ),
                      })
                    }
                  >
                    {legOptions}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Position"
                  value={event.positionSteps}
                  onChange={(value) =>
                    onChange({
                      ...track,
                      events: track.events.map((item) =>
                        item.id === event.id
                          ? { ...item, positionSteps: value }
                          : item,
                      ),
                    })
                  }
                />
                <label className="field">
                  <span>Notiz</span>
                  <input
                    value={event.note}
                    onChange={(change) =>
                      onChange({
                        ...track,
                        events: track.events.map((item) =>
                          item.id === event.id
                            ? { ...item, note: change.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={!track.legs.length}
            onClick={addEvent}
          >
            <Plus />
            Ereignis hinzufügen
          </Button>
        </div>
      </details>
    </section>
  );
}
