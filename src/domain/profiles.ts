export type HandlerGender = "male" | "female";
export type DogGender = "male" | "female";

interface ProfileMetadata {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface HandlerProfile extends ProfileMetadata {
  name: string;
  birthDate: string;
  gender: HandlerGender | "";
  club: string;
  membershipNumber: string;
}

export interface DogProfile extends ProfileMetadata {
  callName: string;
  kennelName: string;
  breed: string;
  birthDate: string;
  gender: DogGender | "";
  performanceRecordId: string;
  chipNumber: string;
  studbookNumber: string;
}

const parseLocalDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
};

export function calculateAge(birthDate: string, today = new Date()) {
  const birth = parseLocalDate(birthDate);
  if (!birth || birth > today) return null;
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() < birth.getDate())
  )
    age--;
  return age;
}

export const validateHandlerProfile = (profile: HandlerProfile) => {
  const errors: string[] = [];
  if (!profile.name.trim()) errors.push("Name fehlt");
  if (calculateAge(profile.birthDate) === null)
    errors.push("Geburtsdatum fehlt oder ist ungültig");
  if (!profile.gender) errors.push("Geschlecht fehlt");
  return errors;
};

export const validateDogProfile = (profile: DogProfile) => {
  const errors: string[] = [];
  if (!profile.callName.trim()) errors.push("Rufname fehlt");
  if (!profile.breed.trim()) errors.push("Rasse fehlt");
  if (calculateAge(profile.birthDate) === null)
    errors.push("Geburtsdatum fehlt oder ist ungültig");
  if (!profile.gender) errors.push("Geschlecht fehlt");
  return errors;
};

export const isHandlerProfile = (value: unknown): value is HandlerProfile => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HandlerProfile>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.birthDate === "string" &&
    ["", "male", "female"].includes(item.gender ?? "invalid") &&
    typeof item.club === "string" &&
    typeof item.membershipNumber === "string"
  );
};

export const isDogProfile = (value: unknown): value is DogProfile => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DogProfile>;
  return (
    typeof item.id === "string" &&
    typeof item.callName === "string" &&
    typeof item.kennelName === "string" &&
    typeof item.breed === "string" &&
    typeof item.birthDate === "string" &&
    ["", "male", "female"].includes(item.gender ?? "invalid") &&
    typeof item.performanceRecordId === "string" &&
    typeof item.chipNumber === "string" &&
    typeof item.studbookNumber === "string"
  );
};
