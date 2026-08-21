import { CalendarCheckIcon } from "lucide-react";
import type { Agent } from "./types";

export const appointmentBooking: Agent = {
  slug: "appointment_booking",
  name: "Appointment Booking",
  desc: "Books consultations directly into your calendar.",
  icon: CalendarCheckIcon,
  categoryId: "front-desk"
};
