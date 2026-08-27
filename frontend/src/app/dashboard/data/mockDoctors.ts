import type { Doctor } from "../doctors/types";

// Placeholder data standing in for the real `User` backend model
// (role="doctor") plus a `specialty`/`capabilities`/`availability`/
// `license_number`/`bio` extension that doesn't exist on that model yet —
// see app/dashboard/README.md. No `photoUrl` on the seed rows on purpose —
// these are placeholder names, not real people, so showing the initial-letter
// avatar (already the app's real empty-photo state) is honest; a doctor
// added through the real "Add doctor" form can upload an actual photo.
export const MOCK_DOCTORS: Doctor[] = [
{
  id: "d1",
  name: "Dr. Julian Reyes",
  initial: "J",
  email: "j.reyes@meridiansurgery.com",
  phone: "+1 (555) 201-4410",
  specialty: "Rhinoplasty & Facial Aesthetics",
  capabilities: ["Rhinoplasty", "Facelift", "Brow Lift", "Chin Augmentation"],
  licenseNumber: "MD-48213-CA",
  yearsExperience: 14,
  bio: "Board-certified facial plastic surgeon focused on rhinoplasty and facelift procedures.",
  availability: [
  { day: "Mon", startTime: "09:00", endTime: "17:00" },
  { day: "Tue", startTime: "09:00", endTime: "17:00" },
  { day: "Wed", startTime: "09:00", endTime: "13:00" },
  { day: "Fri", startTime: "09:00", endTime: "17:00" }],

  documents: [],
  activePatients: 3,
  upcomingSurgeries: 1
},
{
  id: "d2",
  name: "Dr. Elena Vance",
  initial: "E",
  email: "e.vance@meridiansurgery.com",
  phone: "+1 (555) 201-8827",
  specialty: "Breast & Body Contouring",
  capabilities: ["Breast Augmentation", "Breast Reduction", "Tummy Tuck", "Liposuction"],
  licenseNumber: "MD-51902-CA",
  yearsExperience: 9,
  bio: "Specializes in breast augmentation, reduction, and post-bariatric body contouring.",
  availability: [
  { day: "Mon", startTime: "10:00", endTime: "18:00" },
  { day: "Wed", startTime: "10:00", endTime: "18:00" },
  { day: "Thu", startTime: "10:00", endTime: "18:00" },
  { day: "Sat", startTime: "09:00", endTime: "13:00" }],

  documents: [],
  activePatients: 2,
  upcomingSurgeries: 0
}];
