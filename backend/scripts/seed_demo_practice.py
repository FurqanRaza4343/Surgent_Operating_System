"""
Seeds real, non-empty demo data into the practice already used for local
dev testing (resolved by its Owner's email, not hardcoded) — 2 real Doctors
+ 1 real Receptionist (Clerk accounts with immediately-usable passwords) and
a handful of demo Patients spanning the CRM funnel, with real Appointments/
TreatmentPlans/ConsentDocuments/Invoices/Expenses so every dashboard has
data on first run.

Deliberately does NOT create a new Practice: this project's local dev setup
already has one real practice (see backend/.env.example's documented test
logins), and splitting demo data into a second practice would just mean
switching accounts to see it. Idempotent — check-then-create throughout, by
a fixed set of demo emails, so re-running is always safe.

Usage: python scripts/seed_demo_practice.py
"""
import asyncio
from datetime import datetime, timedelta, timezone, date

from sqlalchemy import select

from src.database import async_session_factory
from src.models.user import User, UserRole
from src.models.doctor import Doctor, DoctorProcedure
from src.models.patient import Patient, PatientLifecycleStage
from src.models.appointment import Appointment, AppointmentStatus
from src.models.procedure import Procedure
from src.models.treatment_plan import TreatmentPlan, TreatmentPlanItem, TreatmentPlanStatus, TreatmentPlanItemStatus
from src.models.consent_document import ConsentDocument, ConsentDocumentStatus
from src.models.invoice import Invoice, InvoiceLineItem, InvoiceStatus
from src.models.expense import Expense
from src.services.clerk.clerk_service import ClerkService

OWNER_EMAIL = "aiaceonesolutions.com@gmail.com"

DOCTOR2_EMAIL = "doctor2+clerk_test@aiaceone.dev"
DOCTOR2_PASSWORD = "Aceonedoctor2"


def _has_email(clerk_user: dict, email: str) -> bool:
    return any(e.get("email_address", "").lower() == email.lower() for e in clerk_user.get("email_addresses", []))


async def get_or_create_clerk_login(clerk: ClerkService, email: str, password: str, first_name: str, last_name: str) -> str:
    existing = await clerk.find_user_by_email(email)
    if existing:
        # Belt-and-braces: never trust a "match" that doesn't actually carry
        # the email we searched for — a wrong/unfiltered Clerk API response
        # here would otherwise silently link a Doctor row to a stranger's
        # real account (this exact bug was caught and fixed once already).
        if not _has_email(existing, email):
            raise RuntimeError(
                f"Clerk lookup for {email} returned a non-matching account "
                f"({[e.get('email_address') for e in existing.get('email_addresses', [])]}) — refusing to link it."
            )
        print(f"  Clerk account already exists: {email}")
        return existing["id"]
    created = await clerk.create_user(email, password, first_name, last_name)
    if not _has_email(created, email):
        raise RuntimeError(f"Clerk create_user for {email} returned an unexpected account — aborting.")
    print(f"  Created Clerk account: {email} / password: {password}")
    return created["id"]


async def ensure_doctor2(db, practice_id) -> Doctor:
    clerk = ClerkService()
    clerk_user_id = await get_or_create_clerk_login(clerk, DOCTOR2_EMAIL, DOCTOR2_PASSWORD, "Dr. Amina", "Sadique")

    result = await db.execute(select(User).where(User.clerk_id == clerk_user_id))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            clerk_id=clerk_user_id,
            practice_id=practice_id,
            email=DOCTOR2_EMAIL,
            name="Dr. Amina Sadique",
            role=UserRole.DOCTOR,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        print(f"  Created local User row for {DOCTOR2_EMAIL}")
    elif not user.is_active:
        user.is_active = True
        print(f"  Reactivated local User row for {DOCTOR2_EMAIL}")

    result = await db.execute(select(Doctor).where(Doctor.user_id == user.id))
    doctor = result.scalar_one_or_none()
    if doctor is None:
        doctor = Doctor(
            practice_id=practice_id,
            user_id=user.id,
            name="Dr. Amina Sadique",
            email=DOCTOR2_EMAIL,
            specialty="Body Contouring",
            specializations=["Body Contouring", "Liposuction", "Breast Surgery"],
            license_number="PMDC-DEMO-0002",
            bio="Board-certified plastic surgeon focused on body contouring and post-bariatric reconstruction.",
            qualifications=[
                {"degree": "MBBS", "institution": "King Edward Medical University", "year": 2008},
                {"degree": "FRCS (Plast)", "institution": "Royal College of Surgeons", "year": 2015},
            ],
            working_hours={
                "mon": [{"start": "10:00", "end": "18:00"}],
                "wed": [{"start": "10:00", "end": "18:00"}],
                "fri": [{"start": "10:00", "end": "14:00"}],
            },
            commission_percent=12.0,
            is_active=True,
        )
        db.add(doctor)
        await db.flush()
        print("  Created Doctor row: Dr. Amina Sadique")
    return doctor


async def reactivate_if_needed(db, email: str, label: str):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user and not user.is_active:
        user.is_active = True
        print(f"  Reactivated existing {label} account: {email} (was inactive)")


async def ensure_doctor_procedures(db, doctor: Doctor, practice_id, procedure_names: list[str]):
    existing = await db.execute(select(DoctorProcedure).where(DoctorProcedure.doctor_id == doctor.id))
    if existing.scalars().first():
        return
    procs = await db.execute(select(Procedure).where(Procedure.practice_id == practice_id, Procedure.name.in_(procedure_names)))
    for proc in procs.scalars().all():
        db.add(DoctorProcedure(
            doctor_id=doctor.id,
            procedure_id=proc.id,
            consultation_fee=150.0,
            surgery_fee=float(proc.base_price or 0),
        ))
    await db.flush()


async def rename_staff_if_old(db, email: str, role: UserRole, old_name: str, new_name: str, label: str):
    """Idempotent cosmetic rename — repoints a demo staff account whose local
    name is still the old dev placeholder ('Test Doctor' / 'Test Staff') at its
    real production-style name without touching the Clerk identity. Only fires
    when the old name is present, so safe to re-run."""
    updated = 0
    users = (await db.execute(select(User).where(User.email == email, User.role == role))).scalars().all()
    for u in users:
        if u.name == old_name:
            u.name = new_name
            updated += 1
    if role == UserRole.DOCTOR:
        doctors = (await db.execute(select(Doctor).where(Doctor.email == email))).scalars().all()
        for d in doctors:
            if d.name == old_name:
                d.name = new_name
                updated += 1
    if updated:
        await db.flush()
        print(f"  Renamed {label}: {old_name} -> {new_name}")


DEMO_PATIENTS = [
    dict(
        first="Sana", last="Ali", email="sana.ali+demo@aiaceone.dev", phone="+15550010001",
        stage=PatientLifecycleStage.CONTACTED, complaint="Interested in Botox — asked about pricing on Instagram.",
        source="Instagram",
    ),
    dict(
        first="Bilal", last="Khan", email="bilal.khan+demo@aiaceone.dev", phone="+15550010002",
        stage=PatientLifecycleStage.CONSULT_SCHEDULED, complaint="Rhinoplasty consultation booked for next week.",
        source="Referral",
    ),
    dict(
        first="Ayesha", last="Raza", email="ayesha.raza+demo@aiaceone.dev", phone="+15550010003",
        stage=PatientLifecycleStage.CONSULT_COMPLETED, complaint="Liposuction consultation completed — deciding on dates.",
        source="Website",
    ),
    dict(
        first="Omar", last="Farooq", email="omar.farooq+demo@aiaceone.dev", phone="+15550010004",
        stage=PatientLifecycleStage.PATIENT, complaint="Breast augmentation — completed, in recovery.",
        source="Referral",
    ),
    dict(
        first="Zara", last="Sheikh", email="zara.sheikh+demo@aiaceone.dev", phone="+15550010005",
        stage=PatientLifecycleStage.LOST, complaint="Facelift inquiry — went with another clinic.",
        source="Google", lost_reason="Chose a different provider (price)",
    ),
]


async def seed_patients(db, practice_id, doctors: list[Doctor]):
    procs = (await db.execute(select(Procedure).where(Procedure.practice_id == practice_id))).scalars().all()
    procs_by_name = {p.name: p for p in procs}
    now = datetime.now(timezone.utc)

    for i, spec in enumerate(DEMO_PATIENTS):
        existing = await db.execute(select(Patient).where(Patient.practice_id == practice_id, Patient.email == spec["email"]))
        if existing.scalar_one_or_none():
            print(f"  Patient already seeded: {spec['first']} {spec['last']}")
            continue

        doctor = doctors[i % len(doctors)]
        patient = Patient(
            practice_id=practice_id,
            first_name=spec["first"],
            last_name=spec["last"],
            email=spec["email"],
            phone=spec["phone"],
            chief_complaint=spec["complaint"],
            lifecycle_stage=spec["stage"],
            source=spec["source"],
            lost_reason=spec.get("lost_reason"),
            consent_status=spec["stage"] in (PatientLifecycleStage.CONSULT_COMPLETED, PatientLifecycleStage.PATIENT),
        )
        db.add(patient)
        await db.flush()

        if spec["stage"] in (
            PatientLifecycleStage.CONSULT_SCHEDULED,
            PatientLifecycleStage.CONSULT_COMPLETED,
            PatientLifecycleStage.PATIENT,
        ):
            is_past = spec["stage"] != PatientLifecycleStage.CONSULT_SCHEDULED
            start = now + (timedelta(days=-3) if is_past else timedelta(days=4))
            appt = Appointment(
                practice_id=practice_id,
                patient_id=patient.id,
                doctor_id=doctor.id,
                appointment_type="Consultation",
                status=AppointmentStatus.COMPLETED if is_past else AppointmentStatus.SCHEDULED,
                start_time=start,
                end_time=start + timedelta(minutes=30),
                notes="Seeded demo appointment",
            )
            db.add(appt)
            await db.flush()

        if spec["stage"] in (PatientLifecycleStage.CONSULT_COMPLETED, PatientLifecycleStage.PATIENT):
            proc = procs_by_name.get("Liposuction") if "Lipo" in spec["complaint"] else (
                procs_by_name.get("Breast Augmentation") if "Breast" in spec["complaint"] else procs_by_name.get("Rhinoplasty")
            )
            plan = TreatmentPlan(
                practice_id=practice_id,
                patient_id=patient.id,
                doctor_id=doctor.id,
                title=f"{proc.name if proc else 'Procedure'} treatment plan",
                status=TreatmentPlanStatus.COMPLETED if spec["stage"] == PatientLifecycleStage.PATIENT else TreatmentPlanStatus.PROPOSED,
            )
            db.add(plan)
            await db.flush()
            if proc:
                item_status = TreatmentPlanItemStatus.SCHEDULED if spec["stage"] == PatientLifecycleStage.PATIENT else TreatmentPlanItemStatus.PLANNED
                db.add(TreatmentPlanItem(
                    treatment_plan_id=plan.id,
                    procedure_id=proc.id,
                    status=item_status,
                    estimated_price=proc.base_price,
                    actual_price=proc.base_price if spec["stage"] == PatientLifecycleStage.PATIENT else None,
                ))
                await db.flush()

            db.add(ConsentDocument(
                practice_id=practice_id,
                patient_id=patient.id,
                document_type="Procedure consent",
                content=f"I consent to undergo {proc.name if proc else 'the planned procedure'} as discussed with my surgeon.",
                status=ConsentDocumentStatus.SIGNED if spec["stage"] == PatientLifecycleStage.PATIENT else ConsentDocumentStatus.SENT,
                signed_at=now - timedelta(days=2) if spec["stage"] == PatientLifecycleStage.PATIENT else None,
                signed_by_name=f"{spec['first']} {spec['last']}" if spec["stage"] == PatientLifecycleStage.PATIENT else None,
            ))

        if spec["stage"] == PatientLifecycleStage.PATIENT and proc:
            invoice = Invoice(
                practice_id=practice_id,
                patient_id=patient.id,
                subtotal_amount=float(proc.base_price or 0),
                tax_amount=0,
                discount_amount=0,
                total_amount=float(proc.base_price or 0),
                status=InvoiceStatus.PAID,
                due_date=date.today() - timedelta(days=5),
                paid_at=now - timedelta(days=2),
            )
            db.add(invoice)
            await db.flush()
            db.add(InvoiceLineItem(
                invoice_id=invoice.id,
                description=proc.name,
                quantity=1,
                unit_price=float(proc.base_price or 0),
            ))

        await db.flush()
        print(f"  Seeded patient: {spec['first']} {spec['last']} ({spec['stage'].value})")


async def seed_expenses(db, practice_id, recorded_by_user_id):
    existing = await db.execute(select(Expense).where(Expense.practice_id == practice_id, Expense.category == "Seed demo data"))
    if existing.scalars().first():
        print("  Demo expenses already seeded")
        return
    today = date.today()
    for label, amount, days_ago in [("Clinic rent", 2500.0, 10), ("Marketing — Instagram ads", 400.0, 5), ("Medical supplies", 850.0, 3)]:
        db.add(Expense(
            practice_id=practice_id,
            expense_type="expense",
            status="paid",
            category="Seed demo data",
            amount=amount,
            vendor=label,
            expense_date=today - timedelta(days=days_ago),
            notes=f"Seeded demo expense — {label}",
            paid_at=datetime.now(timezone.utc) - timedelta(days=days_ago),
            recorded_by=recorded_by_user_id,
        ))
    await db.flush()
    print("  Seeded 3 demo expenses")


async def main():
    async with async_session_factory() as db:
        owner_result = await db.execute(select(User).where(User.email == OWNER_EMAIL))
        owner = owner_result.scalar_one_or_none()
        if not owner:
            print(f"ERROR: Owner account {OWNER_EMAIL} not found — sign in as Owner once first.")
            return
        practice_id = owner.practice_id
        print(f"Practice: {practice_id}\n")

        # Configure Green API WhatsApp for this practice (from .env)
        from src.config import get_settings
        settings = get_settings()
        if settings.green_api_instance_id and settings.green_api_token:
            from src.models.practice import Practice
            practice_result = await db.execute(select(Practice).where(Practice.id == practice_id))
            practice = practice_result.scalar_one_or_none()
            if practice:
                current_settings = practice.settings or {}
                if "green_api" not in current_settings:
                    current_settings["green_api"] = {
                        "instance_id": settings.green_api_instance_id,
                        "api_token": settings.green_api_token,
                        "phone_number": "923468063112",
                        "status": "active",
                    }
                    practice.settings = current_settings
                    await db.flush()
                    print(f"  Green API WhatsApp configured for practice")

        print("Doctor 1 (existing dev account):")
        await reactivate_if_needed(db, "doctor+clerk_test@aiaceone.dev", "Doctor")
        await rename_staff_if_old(db, "doctor+clerk_test@aiaceone.dev", UserRole.DOCTOR, "Test Doctor", "Dr. Ehtisham", "Doctor 1")
        doctor1_result = await db.execute(select(Doctor).where(Doctor.email == "doctor+clerk_test@aiaceone.dev"))
        doctor1 = doctor1_result.scalars().first()
        if doctor1:
            await ensure_doctor_procedures(db, doctor1, practice_id, ["Rhinoplasty", "Facelift", "Botox"])
            print(f"  OK: {doctor1.name}")

        print("\nReceptionist (existing dev account):")
        await reactivate_if_needed(db, "staff+clerk_test@aiaceone.dev", "Receptionist")
        await rename_staff_if_old(db, "staff+clerk_test@aiaceone.dev", UserRole.RECEPTIONIST, "Test Staff", "Awon Abbas", "Receptionist")

        print("\nDoctor 2 (new):")
        doctor2 = await ensure_doctor2(db, practice_id)
        await ensure_doctor_procedures(db, doctor2, practice_id, ["Liposuction", "Breast Augmentation", "Dermal Fillers"])

        await db.commit()

        print("\nDemo patients:")
        doctors = [d for d in [doctor1, doctor2] if d]
        await seed_patients(db, practice_id, doctors)
        await db.commit()

        print("\nDemo expenses:")
        await seed_expenses(db, practice_id, owner.id)
        await db.commit()

        print("\n--- Done ---")
        print("Logins:")
        print("  Owner:        (your own real Clerk account)")
        print("  Doctor 1:     doctor+clerk_test@aiaceone.dev / Aceonedoctor  (Dr. Ehtisham)")
        print(f"  Doctor 2:     {DOCTOR2_EMAIL} / {DOCTOR2_PASSWORD}  (Dr. Amina Sadique)")
        print("  Receptionist: staff+clerk_test@aiaceone.dev / Aceonestaff  (Awon Abbas)")


if __name__ == "__main__":
    asyncio.run(main())
