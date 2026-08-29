import type { Doctor } from "./types";

// Onboarding's FirstDoctorStep only collects name + specialty by design (fast
// setup) — this scores how much of the rest a doctor record is still missing,
// so DoctorsPage/DoctorDetailPage can nudge finishing it instead of the gap
// being silently invisible.
interface CompletenessField {
  label: string;
  done: (d: Doctor) => boolean;
}

const FIELDS: CompletenessField[] = [
{ label: "Photo", done: (d) => Boolean(d.photoUrl) },
{ label: "Email", done: (d) => Boolean(d.email.trim()) },
{ label: "Phone", done: (d) => Boolean(d.phone.trim()) },
{ label: "Specialty", done: (d) => Boolean(d.specialty.trim()) },
{ label: "Capabilities", done: (d) => d.capabilities.length > 0 },
{ label: "License number", done: (d) => Boolean(d.licenseNumber.trim()) },
{ label: "Years of experience", done: (d) => d.yearsExperience > 0 },
{ label: "Bio", done: (d) => Boolean(d.bio.trim()) },
{ label: "Availability", done: (d) => d.availability.length > 0 },
{ label: "Documents", done: (d) => d.documents.length > 0 }];


export interface DoctorCompleteness {
  percent: number;
  missing: string[];
}

export function getDoctorCompleteness(doctor: Doctor): DoctorCompleteness {
  const missing = FIELDS.filter((f) => !f.done(doctor)).map((f) => f.label);
  const percent = Math.round(((FIELDS.length - missing.length) / FIELDS.length) * 100);
  return { percent, missing };
}
