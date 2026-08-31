import React, { useRef, useState } from "react";
import { CameraIcon, PlusIcon, TrashIcon } from "lucide-react";
import { usePlan } from "../plan/PlanContext";
import { usePatientPhotos } from "./usePatientPhotos";

const PHOTO_TYPES = ["before", "after", "other"] as const;

// Owner/Doctor only — matches the backend's own visibility boundary for
// clinical photography (see patient_photos_router.py).
export function PatientPhotosGallery({ patientId }: { patientId: string }) {
  const { authedFetch, role } = usePlan();
  const { photos, loading, upload, remove } = usePatientPhotos(authedFetch, patientId);
  const [photoType, setPhotoType] = useState<(typeof PHOTO_TYPES)[number]>("before");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (role !== "owner" && role !== "doctor") return null;

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    await upload(file, photoType);
    setUploading(false);
  }

  return (
    <div className="mb-6 rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <CameraIcon className="h-4 w-4 text-teal-600" /> Clinical photos
        </p>
        <div className="flex items-center gap-2">
          <select
            value={photoType}
            onChange={(e) => setPhotoType(e.target.value as (typeof PHOTO_TYPES)[number])}
            className="rounded-lg border border-sand-200 bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink-soft outline-none focus:border-teal-600/40">

            {PHOTO_TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </select>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600 disabled:opacity-50">

            <PlusIcon className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload photo"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} className="hidden" />
        </div>
      </div>

      <div className="p-5">
        {loading ?
        <p className="text-sm text-ink-muted">Loading…</p> :
        photos.length === 0 ?
        <p className="text-sm text-ink-muted">No photos yet.</p> :

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) =>
          <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-sand-200">
                <img src={photo.cloudinary_url} alt={photo.photo_type || "Patient photo"} className="aspect-square w-full object-cover" />
                {photo.photo_type &&
            <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-semibold capitalize text-white">
                    {photo.photo_type}
                  </span>
            }
                <button
              type="button"
              onClick={() => remove(photo.id)}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100">

                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
          )}
          </div>
        }
      </div>
    </div>);

}
