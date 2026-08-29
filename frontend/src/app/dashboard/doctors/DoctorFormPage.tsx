import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, CameraIcon, FileTextIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { ComingSoon } from "../components/ComingSoon";
import { useDoctors } from "./useDoctors";
import { WEEKDAYS, type AvailabilitySlot, type Doctor, type DoctorDocument, type Weekday } from "./types";
import { DASHBOARD_ROUTES } from "../constants/routes";
import { usePlan } from "../plan/PlanContext";
import { UpgradeRequired } from "../plan/UpgradeRequired";

type DraftDoctor = Omit<Doctor, "id" | "initial" | "activePatients" | "upcomingSurgeries">;

const EMPTY_DRAFT: DraftDoctor = {
  name: "",
  userId: null,
  email: "",
  phone: "",
  specialty: "",
  capabilities: [],
  licenseNumber: "",
  yearsExperience: 0,
  bio: "",
  availability: [],
  documents: [],
  photoUrl: undefined
};

const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function DoctorFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { authedFetch, capabilities } = usePlan();
  const { doctors, getDoctor, addDoctor, updateDoctor, loading } = useDoctors(authedFetch);
  const existing = isEdit ? getDoctor(id!) : undefined;

  // Doctors now load async (IndexedDB) — `existing` isn't available on the
  // very first render, so every hook below must run unconditionally on
  // every render (no early return above them) or React's hook order breaks
  // once loading resolves. The draft is seeded once loading finishes and
  // `existing` is known, via the effect further down.
  const [draft, setDraft] = useState<DraftDoctor>(EMPTY_DRAFT);
  const [draftInitialized, setDraftInitialized] = useState(false);
  const [capabilityInput, setCapabilityInput] = useState("");
  const [slotDay, setSlotDay] = useState<Weekday>("Mon");
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("17:00");
  const [pendingUploads, setPendingUploads] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading || draftInitialized) return;
    if (isEdit && existing) setDraft(existing);
    setDraftInitialized(true);
  }, [loading, isEdit, existing, draftInitialized]);

  // Reading a file into a data URI is async — submitting before it resolves
  // silently dropped the upload (the draft simply didn't have it yet). Block
  // submit and say so instead.
  const canSubmit = Boolean(draft.name.trim() && draft.email.trim() && draft.specialty.trim()) && pendingUploads === 0;

  const set = <K extends keyof DraftDoctor,>(key: K, value: DraftDoctor[K]) =>
  setDraft((prev) => ({ ...prev, [key]: value }));

  function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingUploads((n) => n + 1);
    const reader = new FileReader();
    reader.onload = () => {
      set("photoUrl", reader.result as string);
      setPendingUploads((n) => n - 1);
    };
    reader.onerror = () => setPendingUploads((n) => n - 1);
    reader.readAsDataURL(file);
  }

  function handleDocumentPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    setPendingUploads((n) => n + files.length);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const doc: DoctorDocument = {
          id: `doc${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          mimeType: file.type,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString()
        };
        setDraft((prev) => ({ ...prev, documents: [...prev.documents, doc] }));
        setPendingUploads((n) => n - 1);
      };
      reader.onerror = () => setPendingUploads((n) => n - 1);
      reader.readAsDataURL(file);
    }
  }

  function removeDocument(id: string) {
    set("documents", draft.documents.filter((d) => d.id !== id));
  }

  function addCapability() {
    const v = capabilityInput.trim();
    if (!v || draft.capabilities.includes(v)) return;
    set("capabilities", [...draft.capabilities, v]);
    setCapabilityInput("");
  }

  function removeCapability(v: string) {
    set("capabilities", draft.capabilities.filter((c) => c !== v));
  }

  function addSlot() {
    if (slotStart >= slotEnd) return;
    const slot: AvailabilitySlot = { day: slotDay, startTime: slotStart, endTime: slotEnd };
    const withoutDupe = draft.availability.filter((s) => !(s.day === slot.day && s.startTime === slot.startTime && s.endTime === slot.endTime));
    set("availability", [...withoutDupe, slot]);
  }

  function removeSlot(index: number) {
    set("availability", draft.availability.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaveError(null);

    if (isEdit && existing) {
      const ok = await updateDoctor(existing.id, { ...draft, initial: draft.name.trim()[0]?.toUpperCase() || existing.initial });
      if (!ok) {
        setSaveError("Couldn't save — this browser's storage is full. Try removing a large photo or document.");
        return;
      }
      navigate(DASHBOARD_ROUTES.doctorDetail(existing.id));
      return;
    }

    const id = `d${Date.now()}`;
    const newDoctor: Doctor = {
      ...draft,
      id,
      initial: draft.name.trim()[0]?.toUpperCase() || "?",
      activePatients: 0,
      upcomingSurgeries: 0
    };
    const ok = await addDoctor(newDoctor);
    if (!ok) {
      setSaveError("Couldn't save — this browser's storage is full. Try removing a large photo or document.");
      return;
    }
    navigate(DASHBOARD_ROUTES.doctorDetail(id));
  }

  const slotsByDay = useMemo(() => {
    const map = new Map<Weekday, AvailabilitySlot[]>();
    for (const slot of draft.availability) {
      map.set(slot.day, [...(map.get(slot.day) || []), slot]);
    }
    return map;
  }, [draft.availability]);

  if (loading || !draftInitialized) return null;

  if (isEdit && !existing) {
    return <ComingSoon icon={CameraIcon} title="Doctor not found" body="This doctor record doesn't exist." phase="—" />;
  }

  // Defense-in-depth for a hand-typed /doctors/new URL — the "Add doctor"
  // button on DoctorsPage already hides behind the limit.
  if (!isEdit && doctors.length >= capabilities.limits.maxDoctors) {
    return (
      <UpgradeRequired
        title="Doctor limit reached"
        tagline={`Your plan includes ${capabilities.limits.maxDoctors} doctor${capabilities.limits.maxDoctors === 1 ? "" : "s"} — upgrade to add more.`}
        minTier="practice" />);

  }

  return (
    <>
      <Link
        to={isEdit && existing ? DASHBOARD_ROUTES.doctorDetail(existing.id) : DASHBOARD_ROUTES.doctors}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink">

        <ArrowLeftIcon className="h-4 w-4" /> {isEdit ? "Back to profile" : "Back to doctors"}
      </Link>

      <PageHeader
        title={isEdit ? `Edit ${existing?.name}` : "Add a doctor"}
        subtitle="The details normally collected when a surgeon joins the practice — what they're credentialed to do, when they're available, and their photo." />


      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
          <p className="mb-4 text-sm font-bold text-ink">Photo & identity</p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-sand-200 bg-teal-600/8 text-2xl font-bold text-teal-600">

              {draft.photoUrl ?
              <img src={draft.photoUrl} alt="" className="h-full w-full object-cover" /> :

              draft.name.trim()[0]?.toUpperCase() || <CameraIcon className="h-6 w-6" />
              }
              <span className="absolute inset-0 flex items-center justify-center bg-ink/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <CameraIcon className="h-5 w-5" />
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoPick} className="hidden" />
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <TextField label="Full name" required value={draft.name} onChange={(v) => set("name", v)} placeholder="Dr. Jane Smith" />
              <TextField label="Primary specialty" required value={draft.specialty} onChange={(v) => set("specialty", v)} placeholder="Rhinoplasty & Facial Aesthetics" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
          <p className="mb-4 text-sm font-bold text-ink">Contact & credentials</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Email" required type="email" value={draft.email} onChange={(v) => set("email", v)} placeholder="j.smith@practice.com" />
            <TextField label="Phone" value={draft.phone} onChange={(v) => set("phone", v)} placeholder="+1 (555) 000-0000" />
            <TextField label="License number" value={draft.licenseNumber} onChange={(v) => set("licenseNumber", v)} placeholder="MD-00000-CA" />
            <TextField
              label="Years of experience"
              type="number"
              value={String(draft.yearsExperience)}
              onChange={(v) => set("yearsExperience", Math.max(0, Number(v) || 0))} />

          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Bio</span>
            <textarea
              value={draft.bio}
              onChange={(e) => set("bio", e.target.value)}
              rows={3}
              placeholder="Board-certified surgeon focused on…"
              className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

          </label>
        </div>

        <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
          <p className="mb-1 text-sm font-bold text-ink">Capabilities</p>
          <p className="mb-4 text-xs text-ink-muted">What this doctor is credentialed to perform — shown on their profile and used to route patients.</p>
          <div className="flex flex-wrap gap-2">
            {draft.capabilities.map((c) =>
            <span key={c} className="flex items-center gap-1.5 rounded-full bg-teal-600/8 px-3 py-1.5 text-xs font-semibold text-teal-600">
                {c}
                <button type="button" onClick={() => removeCapability(c)} className="text-teal-600/60 hover:text-teal-600">
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={capabilityInput}
              onChange={(e) => setCapabilityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCapability();
                }
              }}
              placeholder="e.g. Rhinoplasty — press Enter to add"
              className="flex-1 rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

            <button
              type="button"
              onClick={addCapability}
              className="flex items-center gap-1 rounded-xl border border-sand-200 px-3.5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">

              <PlusIcon className="h-4 w-4" /> Add
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
          <p className="mb-1 text-sm font-bold text-ink">Availability</p>
          <p className="mb-4 text-xs text-ink-muted">Which days this doctor is in, and what hours — used for booking and scheduling agents.</p>

          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Day</span>
              <select
                value={slotDay}
                onChange={(e) => setSlotDay(e.target.value as Weekday)}
                className="rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white">

                {WEEKDAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">From</span>
              <input
                type="time"
                value={slotStart}
                onChange={(e) => setSlotStart(e.target.value)}
                className="rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">To</span>
              <input
                type="time"
                value={slotEnd}
                onChange={(e) => setSlotEnd(e.target.value)}
                className="rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

            </label>
            <button
              type="button"
              onClick={addSlot}
              className="flex items-center gap-1 rounded-xl border border-sand-200 px-3.5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">

              <PlusIcon className="h-4 w-4" /> Add slot
            </button>
          </div>

          {draft.availability.length > 0 &&
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {WEEKDAYS.filter((d) => slotsByDay.has(d)).map((day) =>
            <div key={day} className="rounded-xl bg-sand-100 px-4 py-2.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{day}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {slotsByDay.get(day)!.map((slot, i) =>
                <span key={i} className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-soft">
                        {slot.startTime}–{slot.endTime}
                        <button
                    type="button"
                    onClick={() => removeSlot(draft.availability.indexOf(slot))}
                    className="text-ink-muted hover:text-danger">

                          <XIcon className="h-3 w-3" />
                        </button>
                      </span>
                )}
                  </div>
                </div>
            )}
            </div>
          }
        </div>

        <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
          <p className="mb-1 text-sm font-bold text-ink">Documents</p>
          <p className="mb-4 text-xs text-ink-muted">License, certification, CV — PDF or Word. Stored in this browser for now.</p>

          {draft.documents.length > 0 &&
          <div className="mb-3 space-y-2">
              {draft.documents.map((doc) =>
            <div key={doc.id} className="flex items-center gap-3 rounded-xl bg-sand-100 px-4 py-2.5">
                  <FileTextIcon className="h-4 w-4 shrink-0 text-teal-600" />
                  <span className="flex-1 truncate text-sm font-medium text-ink-soft">{doc.name}</span>
                  <button
                type="button"
                onClick={() => removeDocument(doc.id)}
                className="text-ink-muted hover:text-danger">

                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
            )}
            </div>
          }

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-sand-200 px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">
            <UploadIcon className="h-4 w-4" /> Upload document(s)
            <input type="file" accept={DOCUMENT_ACCEPT} multiple onChange={handleDocumentPick} className="hidden" />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saveError && <p className="mr-auto text-sm font-medium text-danger">{saveError}</p>}
          {!saveError && pendingUploads > 0 && <p className="mr-auto text-sm text-ink-muted">Uploading {pendingUploads} file{pendingUploads > 1 ? "s" : ""}…</p>}
          <Link
            to={isEdit && existing ? DASHBOARD_ROUTES.doctorDetail(existing.id) : DASHBOARD_ROUTES.doctors}
            className="rounded-xl border border-sand-200 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink-muted/40">

            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">

            {pendingUploads > 0 ? "Uploading…" : isEdit ? "Save changes" : "Add doctor"}
          </button>
        </div>
      </form>
    </>);

}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required



}: {label: string;value: string;onChange: (v: string) => void;placeholder?: string;type?: string;required?: boolean;}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}{required && <span className="text-danger"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

    </label>);

}
