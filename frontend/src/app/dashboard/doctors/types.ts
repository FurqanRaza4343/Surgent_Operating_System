export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export const WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// One block of availability — a doctor can have several (e.g. Mon–Fri
// mornings in one location, Sat afternoons for a second clinic).
export interface AvailabilitySlot {
  day: Weekday;
  startTime: string; // "09:00", 24h
  endTime: string; // "17:00", 24h
}

// License, certification, CV — whatever paperwork a doctor's file needs.
// Stored as a data URI (like photoUrl) since there's no file-storage backend
// yet — fine for a PDF or two, but this is the thing to swap for real
// object storage (S3/R2) once documents get numerous or large.
export interface DoctorDocument {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  uploadedAt: string; // ISO
}

export interface Doctor {
  id: string;
  name: string;
  initial: string;
  photoUrl?: string;
  email: string;
  phone: string;
  specialty: string;
  // Set once this doctor has accepted their portal invite and a linked User
  // row exists (backend/src/models/doctor.py's user_id) — null until then.
  userId: string | null;
  // Owner-controlled — false means the Owner removed this doctor, which also
  // deactivates their linked login (see doctors_services.py's update_doctor).
  // Defaults to true (every doctor starts active).
  isActive: boolean;
  // Procedures/services this doctor is credentialed to perform — what they
  // can actually do, shown as chips on their profile and usable later to
  // route the AI consultation/booking agents to the right doctor.
  capabilities: string[];
  licenseNumber: string;
  yearsExperience: number;
  bio: string;
  availability: AvailabilitySlot[];
  documents: DoctorDocument[];
  activePatients: number;
  upcomingSurgeries: number;
}
