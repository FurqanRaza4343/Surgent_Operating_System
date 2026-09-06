export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  // Explicit, not derived from `name` at render time — a naive
  // `name.split(" ").map(n => n[0])` would turn "Dr. Julian Reyes" into
  // "DJR" (the "Dr." prefix counts as a word). Set by hand instead.
  initials: string;
}

export const TESTIMONIALS: Testimonial[] = [
{
  quote:
  "We stopped losing after-hours leads overnight. The receptionist and booking agents alone paid for the platform in the first month.",
  name: "Dr. Julian Reyes",
  role: "Founder, Meridian Plastic Surgery",
  initials: "JR"
},
{
  quote:
  "Our front desk finally focuses on patients in the room, not the phone. The recovery agents keep post-op patients calm and safe.",
  name: "Dr. Elena Vance",
  role: "Clinic Director, Lumière Aesthetics",
  initials: "EV"
},
{
  quote:
  "Instagram and WhatsApp used to be a black hole. Now every DM gets an instant, on-brand reply — and most turn into consults.",
  name: "Marcus Feld",
  role: "Practice Manager, Nova Cosmetic Group",
  initials: "MF"
}];
