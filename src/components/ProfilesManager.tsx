import { Children, useState } from "react";
import { Pencil, Plus, Trash2, UserRound, Dog } from "lucide-react";
import {
  deleteDogProfile,
  deleteHandlerProfile,
  saveDogProfile,
  saveHandlerProfile,
} from "../data/db";
import {
  calculateAge,
  type DogProfile,
  type HandlerProfile,
} from "../domain/profiles";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useFeedback } from "./feedbackContext";

const timestamp = () => new Date().toISOString();
const emptyHandler = (): HandlerProfile => ({
  id: crypto.randomUUID(),
  name: "",
  birthDate: "",
  gender: "",
  club: "",
  membershipNumber: "",
  createdAt: timestamp(),
  updatedAt: timestamp(),
});
const emptyDog = (): DogProfile => ({
  id: crypto.randomUUID(),
  callName: "",
  kennelName: "",
  breed: "",
  birthDate: "",
  gender: "",
  performanceRecordId: "",
  chipNumber: "",
  studbookNumber: "",
  createdAt: timestamp(),
  updatedAt: timestamp(),
});
const today = new Date().toISOString().slice(0, 10);

export function ProfilesManager({
  handlers,
  dogs,
}: {
  handlers: HandlerProfile[];
  dogs: DogProfile[];
}) {
  const [kind, setKind] = useState<"handlers" | "dogs">("handlers");
  const [handler, setHandler] = useState<HandlerProfile | null>(null);
  const [dog, setDog] = useState<DogProfile | null>(null);
  const [message, setMessage] = useState("");
  const { notify } = useFeedback();

  const removeHandler = async (profile: HandlerProfile) => {
    if (!confirm(`${profile.name} wirklich löschen?`)) return;
    try {
      await deleteHandlerProfile(profile.id);
      setMessage("Hundeführer wurde gelöscht.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Löschen fehlgeschlagen.");
    }
  };
  const removeDog = async (profile: DogProfile) => {
    if (!confirm(`${profile.callName} wirklich löschen?`)) return;
    try {
      await deleteDogProfile(profile.id);
      setMessage("Hund wurde gelöscht.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Löschen fehlgeschlagen.");
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <p className="eyebrow text-teal">GLOBAL · ALLE MODULE</p>
        <h2>Hundeführer & Hunde</h2>
        <p className="mt-2 text-sm text-muted">
          Profile stehen im THS- und IBGH-Modul gemeinsam zur Verfügung.
        </p>
      </div>
      <div className="profile-tabs" role="tablist" aria-label="Profilart">
        <button type="button" role="tab" aria-selected={kind === "handlers"} className={kind === "handlers" ? "active" : ""} onClick={() => setKind("handlers")}>
          <UserRound /> Hundeführer ({handlers.length})
        </button>
        <button type="button" role="tab" aria-selected={kind === "dogs"} className={kind === "dogs" ? "active" : ""} onClick={() => setKind("dogs")}>
          <Dog /> Hunde ({dogs.length})
        </button>
      </div>
      {message ? <p className="profile-message" role="status">{message}</p> : null}

      {kind === "handlers" ? (
        handler ? (
          <HandlerForm
            value={handler}
            onCancel={() => setHandler(null)}
            onSave={async (value) => {
              try {
                const isNew = !handlers.some((item) => item.id === value.id);
                await saveHandlerProfile(value);
                setHandler(null);
                setMessage("Hundeführer wurde gespeichert.");
                if (isNew)
                  notify({
                    kind: "profile-handler",
                    title: "Hundeführer angelegt",
                    message: `${value.name} steht jetzt in allen Modulen zur Verfügung.`,
                  });
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
              }
            }}
          />
        ) : (
          <>
            <Button onClick={() => setHandler(emptyHandler())}><Plus /> Hundeführer anlegen</Button>
            <ProfileList empty="Noch kein Hundeführer angelegt.">
              {handlers.map((item) => (
                <ProfileRow
                  key={item.id}
                  title={item.name}
                  subtitle={`${calculateAge(item.birthDate) ?? "–"} Jahre${item.club ? ` · ${item.club}` : ""}`}
                  incomplete={!item.birthDate || !item.gender}
                  onEdit={() => setHandler({ ...item })}
                  onDelete={() => void removeHandler(item)}
                />
              ))}
            </ProfileList>
          </>
        )
      ) : dog ? (
        <DogForm
          value={dog}
          onCancel={() => setDog(null)}
          onSave={async (value) => {
            try {
              const isNew = !dogs.some((item) => item.id === value.id);
              await saveDogProfile(value);
              setDog(null);
              setMessage("Hund wurde gespeichert.");
              if (isNew)
                notify({
                  kind: "profile-dog",
                  title: "Hund angelegt",
                  message: `${value.callName} steht jetzt in allen Modulen zur Verfügung.`,
                });
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
            }
          }}
        />
      ) : (
        <>
          <Button onClick={() => setDog(emptyDog())}><Plus /> Hund anlegen</Button>
          <ProfileList empty="Noch kein Hund angelegt.">
            {dogs.map((item) => (
              <ProfileRow
                key={item.id}
                title={item.callName}
                subtitle={`${item.breed || "Rasse noch offen"} · ${calculateAge(item.birthDate) ?? "–"} Jahre`}
                incomplete={!item.birthDate || !item.gender || !item.breed}
                onEdit={() => setDog({ ...item })}
                onDelete={() => void removeDog(item)}
              />
            ))}
          </ProfileList>
        </>
      )}
    </section>
  );
}

function HandlerForm({ value, onSave, onCancel }: { value: HandlerProfile; onSave: (value: HandlerProfile) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState(value);
  return (
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void onSave(form); }}>
      <Card className="space-y-3">
        <h3>Persönliche Daten</h3>
        <Field label="Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Geburtsdatum"><input required type="date" max={today} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></Field>
          <Field label="Geschlecht"><select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as HandlerProfile["gender"] })}><option value="">Bitte auswählen</option><option value="male">Männlich</option><option value="female">Weiblich</option></select></Field>
        </div>
        <Age value={form.birthDate} />
      </Card>
      <Card className="space-y-3"><h3>Vereinsdaten <small>(optional)</small></h3>
        <Field label="Verein"><input value={form.club} onChange={(e) => setForm({ ...form, club: e.target.value })} /></Field>
        <Field label="Mitgliedsnummer"><input value={form.membershipNumber} onChange={(e) => setForm({ ...form, membershipNumber: e.target.value })} /></Field>
      </Card>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function DogForm({ value, onSave, onCancel }: { value: DogProfile; onSave: (value: DogProfile) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState(value);
  return (
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void onSave(form); }}>
      <Card className="space-y-3"><h3>Grunddaten</h3>
        <Field label="Rufname"><input required value={form.callName} onChange={(e) => setForm({ ...form, callName: e.target.value })} /></Field>
        <Field label="Zwingername (optional)"><input value={form.kennelName} onChange={(e) => setForm({ ...form, kennelName: e.target.value })} /></Field>
        <Field label="Rasse"><input required value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Geburtsdatum"><input required type="date" max={today} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></Field>
          <Field label="Geschlecht"><select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as DogProfile["gender"] })}><option value="">Bitte auswählen</option><option value="male">Rüde</option><option value="female">Hündin</option></select></Field>
        </div>
        <Age value={form.birthDate} />
      </Card>
      <Card className="space-y-3"><h3>LU-Daten <small>(optional)</small></h3>
        <Field label="LU-Kennung"><input value={form.performanceRecordId} onChange={(e) => setForm({ ...form, performanceRecordId: e.target.value })} /></Field>
        <Field label="Chipnummer"><input inputMode="numeric" value={form.chipNumber} onChange={(e) => setForm({ ...form, chipNumber: e.target.value })} /></Field>
        <Field label="ZB-Reg.-Nr."><input value={form.studbookNumber} onChange={(e) => setForm({ ...form, studbookNumber: e.target.value })} /></Field>
      </Card>
      <FormActions onCancel={onCancel} />
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Age({ value }: { value: string }) { const age = calculateAge(value); return <p className="age-display">Alter: <strong>{age === null ? "–" : `${age} Jahre`}</strong> · automatisch zum heutigen Datum</p>; }
function FormActions({ onCancel }: { onCancel: () => void }) { return <div className="flex gap-2"><Button className="flex-1">Speichern</Button><Button type="button" variant="ghost" onClick={onCancel}>Abbrechen</Button></div>; }
function ProfileList({ children, empty }: { children: React.ReactNode; empty: string }) { return <div className="space-y-2">{Children.count(children) ? children : <Card><p className="text-sm text-muted">{empty}</p></Card>}</div>; }
function ProfileRow({ title, subtitle, incomplete, onEdit, onDelete }: { title: string; subtitle: string; incomplete: boolean; onEdit: () => void; onDelete: () => void }) {
  return <Card className="profile-row"><div className="min-w-0 flex-1"><h3 className="truncate">{title}</h3><p className="text-sm text-muted">{subtitle}</p>{incomplete ? <span className="badge draft mt-2">Daten ergänzen</span> : null}</div><Button variant="ghost" onClick={onEdit} aria-label={`${title} bearbeiten`}><Pencil /></Button><Button variant="danger" onClick={onDelete} aria-label={`${title} löschen`}><Trash2 /></Button></Card>;
}
