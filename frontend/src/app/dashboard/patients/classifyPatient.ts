import { AGENTS_BY_SLUG } from "../../../data/agents";

// A lightweight, fully-local "AI triage" — no LLM call, just keyword
// matching against what a patient would actually say (not the agents' own
// marketing copy, which uses different vocabulary). Real classification
// (an actual LLM call) is a natural swap for classify() below once a
// backend endpoint exists — the return shape (agentSlug/categoryId/reasoning)
// wouldn't need to change.
const AGENT_KEYWORDS: Record<string, string[]> = {
  // Front Desk & Intake
  receptionist: ["hello", "hi", "question", "call", "speak to someone", "help"],
  appointment_booking: ["book", "schedule", "appointment", "consult", "consultation", "available"],
  reschedule_cancellation: ["reschedule", "cancel", "change my appointment", "move my appointment", "postpone"],
  appointment_reminder: ["remind", "reminder", "forgot my appointment"],
  multilingual_translation: ["translate", "language", "speak spanish", "speak urdu", "don't speak english"],
  // Consultation & Screening
  ai_consultation: ["consult", "advice", "what should i do", "options", "interested in"],
  photo_analysis: ["photo", "picture", "image", "look at my", "before and after"],
  video_consultation: ["video call", "video consult", "zoom", "virtual visit", "online consultation"],
  medical_history_intake: ["medical history", "allergies", "medications i take", "past surgery", "health conditions"],
  risk_assessment: ["risk", "am i a candidate", "safe for me", "complication", "pre-existing"],
  procedure_recommendation: ["which procedure", "recommend", "what procedure", "best option", "suggest"],
  pre_surgery_preparation: ["prepare for surgery", "before my surgery", "pre-op", "what to do before"],
  // Surgery Management
  surgery_scheduling: ["schedule surgery", "surgery date", "book surgery", "surgery appointment", "operation date"],
  surgeon_calendar: ["surgeon availability", "when is dr", "surgeon schedule"],
  operating_room_scheduler: ["operating room", "or availability", "surgery slot"],
  equipment_checklist: ["equipment", "tools ready"],
  implant_inventory: ["implant", "implant size", "implant availability"],
  surgical_documentation: ["surgical record", "operative report", "documentation"],
  // Post-Surgery Care
  recovery_followup: ["recovery", "how am i healing", "check in", "follow up", "follow-up"],
  healing_monitoring: ["healing", "swelling going down", "bruising", "progress photo"],
  emergency_triage: ["emergency", "urgent", "severe pain", "bleeding", "fever", "infection", "can't breathe", "worried"],
  medication_reminder: ["medication", "pills", "prescription", "when do i take"],
  wound_care_guidance: ["wound", "dressing", "bandage", "incision", "scar care", "stitches"],
  recovery_dashboard: ["recovery progress", "healing timeline"],
  // Business & Operations
  cost_estimation: ["cost", "price", "how much", "quote", "estimate", "afford"],
  payment_invoice: ["invoice", "bill", "payment", "pay my bill", "receipt"],
  insurance_verification: ["insurance", "covered", "coverage", "claim"],
  analytics_dashboard: ["metrics", "analytics", "reporting"],
  patient_feedback: ["feedback", "review", "complaint about service", "how was my visit"],
  marketing_followup: ["promotion", "offer", "discount", "deal"],
  lead_nurturing: ["thinking about", "considering", "not sure yet", "just looking"]
};

// Surgery-adjacent agents get a boost when the patient explicitly needs
// surgery — even a vaguely-worded complaint should lean surgical, not land
// on a generic front-desk agent.
const SURGERY_BOOST_SLUGS = [
"surgery_scheduling",
"risk_assessment",
"procedure_recommendation",
"pre_surgery_preparation",
"surgeon_calendar"];


export interface ClassificationResult {
  agentSlug: string;
  categoryId: string;
  reasoning: string;
}

export function classifyPatient(complaint: string, needsSurgery: boolean): ClassificationResult {
  const text = complaint.toLowerCase();
  const scores: Record<string, { score: number; matched: string[] }> = {};

  for (const [slug, keywords] of Object.entries(AGENT_KEYWORDS)) {
    const matched = keywords.filter((k) => text.includes(k));
    let score = matched.length;
    if (needsSurgery && SURGERY_BOOST_SLUGS.includes(slug)) score += 1.5;
    if (score > 0) scores[slug] = { score, matched };
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);

  if (ranked.length === 0) {
    // No keyword match at all — default to the real front-desk entry point,
    // same as how an unclear call would route in a real clinic.
    const fallbackSlug = needsSurgery ? "surgery_scheduling" : "receptionist";
    const agent = AGENTS_BY_SLUG[fallbackSlug];
    return {
      agentSlug: fallbackSlug,
      categoryId: agent.categoryId,
      reasoning: needsSurgery ?
      "No specific keywords matched, but surgery was indicated — routed to Surgery Scheduling as a safe default." :
      "No specific keywords matched — routed to the AI Receptionist as the default first point of contact."
    };
  }

  const [bestSlug, { matched }] = ranked[0];
  const agent = AGENTS_BY_SLUG[bestSlug];
  const matchedText = matched.length > 0 ? `matched "${matched.join('", "')}"` : "surgery flag";
  return {
    agentSlug: bestSlug,
    categoryId: agent.categoryId,
    reasoning: `${matchedText} → routed to ${agent.name}${needsSurgery ? " (surgery indicated)" : ""}.`
  };
}
