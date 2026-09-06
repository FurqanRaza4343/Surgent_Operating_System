from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.patient import Patient
from src.models.recovery_journal import RecoveryJournal
from src.models.recovery_checkin import RecoveryCheckIn, RecoveryCheckpoint, SwellingLevel
from src.server.exceptions import NotFoundException

# Plain threshold rule, not an LLM call — this module's whole job is
# collect -> classify -> alert, never diagnose (matches the project's
# existing "no unqualified clinical claims" boundary, and the user's own
# stated boundary for AI in the post-op journey). A flag means "put this in
# front of a human," not a clinical conclusion.
_PAIN_FLAG_THRESHOLD = 8
_FEVER_THRESHOLD_CELSIUS = 38.5


def _classify(pain_score, swelling_level, temperature_celsius, concerns) -> tuple[bool, str | None]:
    reasons = []
    if pain_score is not None and pain_score >= _PAIN_FLAG_THRESHOLD:
        reasons.append(f"pain {pain_score}/10")
    if temperature_celsius is not None and temperature_celsius >= _FEVER_THRESHOLD_CELSIUS:
        reasons.append(f"temperature {temperature_celsius}°C")
    if swelling_level == SwellingLevel.SEVERE:
        reasons.append("severe swelling")
    if concerns and concerns.strip():
        reasons.append("patient reported a concern")
    return (bool(reasons), "; ".join(reasons) if reasons else None)


class RecoveryService:
    """Post-op recovery timeline — RecoveryJournal existed as a model with
    zero real writers before this; this is what makes it real. A journal is
    the per-patient/per-procedure summary record, RecoveryCheckIn rows are
    the individual Day 1/3/7/14/1-month submissions against it."""

    async def _get_practice_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> Patient:
        result = await db.execute(select(Patient).where(Patient.id == patient_id, Patient.practice_id == practice_id))
        patient = result.scalar_one_or_none()
        if patient is None:
            raise NotFoundException("Patient not found")
        return patient

    async def get_or_create_journal(
        self, db: AsyncSession, patient_id: UUID, procedure_id: UUID | None = None, surgery_date=None
    ) -> RecoveryJournal:
        result = await db.execute(
            select(RecoveryJournal)
            .where(RecoveryJournal.patient_id == patient_id, RecoveryJournal.status == "active")
            .order_by(desc(RecoveryJournal.created_at))
            .limit(1)
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            return existing

        journal = RecoveryJournal(
            patient_id=patient_id,
            procedure_id=procedure_id,
            surgery_date=surgery_date,
            status="active",
        )
        db.add(journal)
        await db.flush()
        return journal

    async def get_journal_for_patient(self, db: AsyncSession, practice_id: UUID, patient_id: UUID) -> RecoveryJournal | None:
        await self._get_practice_patient(db, practice_id, patient_id)
        result = await db.execute(
            select(RecoveryJournal)
            .where(RecoveryJournal.patient_id == patient_id)
            .options(selectinload(RecoveryJournal.checkins))
            .order_by(desc(RecoveryJournal.created_at))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def submit_checkin(
        self,
        db: AsyncSession,
        journal: RecoveryJournal,
        checkpoint: RecoveryCheckpoint,
        pain_score: int | None = None,
        swelling_level: SwellingLevel | None = None,
        temperature_celsius: float | None = None,
        symptoms: list | None = None,
        concerns: str | None = None,
        photo_url: str | None = None,
    ) -> RecoveryCheckIn:
        flagged, reason = _classify(pain_score, swelling_level, temperature_celsius, concerns)
        checkin = RecoveryCheckIn(
            recovery_journal_id=journal.id,
            checkpoint=checkpoint,
            pain_score=pain_score,
            swelling_level=swelling_level,
            temperature_celsius=temperature_celsius,
            symptoms=symptoms or [],
            concerns=concerns,
            photo_url=photo_url,
            flagged_for_review=flagged,
            flag_reason=reason,
        )
        db.add(checkin)

        # Roll the journal's summary fields forward — checkin_completion is
        # a simple count against the 5 standard checkpoints, healing_score a
        # simple inverse-of-pain proxy (not a clinical score, just a glanceable
        # trend for the dashboard widget this feeds).
        result = await db.execute(
            select(RecoveryCheckIn).where(RecoveryCheckIn.recovery_journal_id == journal.id)
        )
        all_checkins = list(result.scalars().all()) + [checkin]
        journal.checkin_completion = min(100, round(len(all_checkins) / 5 * 100))
        pain_scores = [c.pain_score for c in all_checkins if c.pain_score is not None]
        if pain_scores:
            journal.healing_score = max(0, 100 - round((sum(pain_scores) / len(pain_scores)) * 10))
        journal.recovery_day = _CHECKPOINT_DAYS.get(checkpoint, journal.recovery_day)

        await db.flush()
        return checkin

    async def list_flagged(self, db: AsyncSession, practice_id: UUID) -> list[tuple[RecoveryCheckIn, Patient]]:
        """The staff review queue — every unreviewed flagged checkin across
        the whole practice, newest first."""
        result = await db.execute(
            select(RecoveryCheckIn, Patient)
            .join(RecoveryJournal, RecoveryCheckIn.recovery_journal_id == RecoveryJournal.id)
            .join(Patient, RecoveryJournal.patient_id == Patient.id)
            .where(
                Patient.practice_id == practice_id,
                RecoveryCheckIn.flagged_for_review.is_(True),
                RecoveryCheckIn.reviewed_at.is_(None),
            )
            .order_by(desc(RecoveryCheckIn.created_at))
        )
        return [(row[0], row[1]) for row in result.all()]

    async def mark_reviewed(self, db: AsyncSession, practice_id: UUID, user_id: UUID, checkin_id: UUID) -> RecoveryCheckIn:
        result = await db.execute(
            select(RecoveryCheckIn)
            .join(RecoveryJournal, RecoveryCheckIn.recovery_journal_id == RecoveryJournal.id)
            .join(Patient, RecoveryJournal.patient_id == Patient.id)
            .where(RecoveryCheckIn.id == checkin_id, Patient.practice_id == practice_id)
        )
        checkin = result.scalar_one_or_none()
        if checkin is None:
            raise NotFoundException("Check-in not found")
        checkin.reviewed_by_user_id = user_id
        checkin.reviewed_at = datetime.now(timezone.utc)
        await db.flush()
        return checkin


_CHECKPOINT_DAYS = {
    RecoveryCheckpoint.DAY_1: 1,
    RecoveryCheckpoint.DAY_3: 3,
    RecoveryCheckpoint.DAY_7: 7,
    RecoveryCheckpoint.DAY_14: 14,
    RecoveryCheckpoint.MONTH_1: 30,
}
