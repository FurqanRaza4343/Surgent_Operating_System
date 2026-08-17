# AesthetixAI Backend

FastAPI + PostgreSQL + SQLAlchemy backend for AesthetixAI platform.

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Copy env file
cp .env.example .env
# Edit .env with your credentials

# Run migrations
alembic upgrade head

# Start server
uvicorn src.main:app --reload
```

## API Docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
src/
├── main.py              # FastAPI entry point
├── config.py            # Settings
├── database.py          # SQLAlchemy setup
├── server/              # Middleware, exceptions, dependencies
├── router/v1/           # API routes
│   ├── agent/           # 31 agent routers
│   └── webhooks/        # External service webhooks
├── controller/agent/    # 31 agent controllers
├── services/
│   ├── agent/           # 31 agent services
│   ├── clerk/           # Clerk auth
│   ├── cloudinary/      # Image storage
│   ├── twilio/          # Phone/SMS
│   ├── llm/             # OpenAI
│   ├── email/           # SendGrid
│   ├── whatsapp/        # WhatsApp API
│   ├── instagram/       # Instagram API
│   ├── calendar/        # Google Calendar
│   ├── payment/         # Stripe
│   └── ehr/             # EHR adapter
├── models/              # SQLAlchemy ORM models
└── schemas/             # Pydantic schemas
```
