# 🏥 Plastic Surgery AI Operating System
## Complete Technical & Operational Guide

**Version:** 1.0  
**Status:** Production-Ready Architecture  
**Last Updated:** July 2026

---

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [System Overview](#system-overview)
3. [Architecture Deep Dive](#architecture-deep-dive)
4. [Technology Stack](#technology-stack)
5. [Deployment Guide](#deployment-guide)
6. [Security & Compliance](#security--compliance)
7. [Operational Runbook](#operational-runbook)
8. [Common Issues & Troubleshooting](#troubleshooting)
9. [Scaling Strategy](#scaling-strategy)

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (v24+)
- Node.js 22+ (for local NestJS development)
- Python 3.11+ (for local FastAPI development)
- Git, Git LFS (for large files)
- A 4vCPU/16GB RAM VPS or cloud instance

### One-Command Local Setup
```bash
# Clone and setup
git clone <repo>
cd plastic-surgery-ai-os
cp .env.example .env
docker compose up -d

# System is ready at: http://localhost:3000
# API at: http://localhost:3001
# Admin panel at: http://localhost:3000/admin
```

### First Deploy to VPS
```bash
# SSH into VPS, then:
cd /opt/plastic-surgery-ai
git pull origin main
docker compose pull
docker compose up -d
docker compose logs -f

# Verify services
curl http://localhost:3001/health
curl http://localhost:8000/health
```

---

## 🏗️ System Overview

### What This System Does
A complete **clinic management + AI-powered patient engagement platform** for plastic surgery practices:

- **Patient Portal:** Self-serve consultations, appointment booking, medical history
- **Staff Dashboard:** Patient management, billing, surgery scheduling
- **AI Agents:** 25–35 autonomous agents handling everything from patient intake to post-op reminders
- **Medical Records:** Secure document storage, RAG-based search, clinical notes
- **Compliance:** HIPAA-ready, audit trails via LangSmith + Sentry, encrypted backups

### Core Workflow
```
Patient lands on website
  ↓
Receptionist AI agent (stateful conversation)
  ↓
Appointment Booking agent (calendar + payment)
  ↓
Clinic staff receives booking notification
  ↓
Doctor reviews pre-consultation via AI analysis agents
  ↓
Post-op: Reminder agents + Healing Progress tracking
```

### Why This Architecture?

| Decision | Reason |
|----------|--------|
| Single VPS, not microservices | 4 vCPU can't justify the process/network overhead of 25+ services |
| Two backend languages (Node + Python) | Node excels at CRUD/API routing; Python owns AI/ML orchestration |
| FastAPI hidden behind NestJS | Single, auditable entry point; easier to rate-limit and log |
| LLM cost routing (Mistral → OpenAI) | Low-stakes tasks are free; high-stakes are reliable & paid |
| Cloudflare R2 (not local disk) | Patient photos are protected from disk failures; auto-replicated |
| LangGraph for multi-turn agents | Stateful conversations persist reliably; easier debugging than raw chains |

---

## 🔧 Architecture Deep Dive

### 1️⃣ Entry Point: Cloudflare → Nginx → NestJS

```
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare (WAF, DDoS, DNS, CDN, TLS)                       │
├─────────────────────────────────────────────────────────────┤
│ DNS Resolver → Routes all *.yourclinic.com → Nginx IP      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Nginx (Reverse Proxy, port 80/443)                          │
├─────────────────────────────────────────────────────────────┤
│ • Terminates TLS (from Cloudflare)                          │
│ • Routes /api/* → NestJS:3001                               │
│ • Routes /* → Next.js SSR:3000                              │
│ • Rate-limits: 100 req/sec per IP, burst 500                │
└─────────────────────────────────────────────────────────────┘
                    ↙           ↘
         ┌──────────────┐   ┌──────────────┐
         │ Next.js:3000 │   │ NestJS:3001  │
         │ (Frontend)   │   │ (API Layer)  │
         └──────────────┘   └──────────────┘
                                  ↓
                    ┌─────────────────────────┐
                    │ Internal Service Auth   │
                    │ (Bearer token + HMAC)   │
                    └─────────────────────────┘
                                  ↓
                    ┌─────────────────────────┐
                    │ FastAPI:8000            │
                    │ (AI Agent Service)      │
                    │ Internal network only   │
                    └─────────────────────────┘
```

**Key Security Points:**
- FastAPI is **never** exposed to the public internet
- Every agent call authenticated with a rotating service token (updated hourly)
- HMAC signature on all cross-service requests
- Cloudflare WAF blocks malicious patterns before hitting Nginx

### 2️⃣ NestJS Business Layer

**Owns:**
- Patient records (PII, medical history, photos metadata)
- Appointments & surgery schedules
- Billing, invoicing, payment records
- Staff management & permissions
- Clinic configuration per tenant
- RBAC rules & role definitions

**Modules Structure:**
```
api-service/src/
├── modules/
│   ├── auth/
│   │   ├── clerk.webhook.controller.ts (Clerk user sync)
│   │   ├── jwt-auth.guard.ts (session validation)
│   │   └── rbac.decorator.ts (role-based access)
│   ├── patients/
│   │   ├── patient.entity.ts
│   │   ├── patient.service.ts
│   │   ├── patient.controller.ts (CRUD endpoints)
│   │   └── patient.repository.ts
│   ├── appointments/
│   │   ├── appointment.service.ts
│   │   ├── appointment.controller.ts
│   │   └── notification.queue.producer.ts (→ RabbitMQ)
│   ├── billing/
│   │   ├── invoice.service.ts
│   │   ├── payment.gateway.ts (Stripe/PayPal integration)
│   │   └── payment.webhook.controller.ts
│   ├── staff/
│   │   ├── user.service.ts
│   │   ├── role.service.ts
│   │   └── clinic-scoping.middleware.ts
│   └── agents-gateway/
│       ├── agent.client.ts (HTTP to FastAPI)
│       ├── agent.interceptor.ts (service token auth)
│       └── agent.error-handler.ts
├── common/
│   ├── database/
│   │   ├── prisma.service.ts
│   │   └── connection-pool.config.ts
│   ├── security/
│   │   ├── encryption.service.ts (field-level encryption)
│   │   ├── rate-limiter.middleware.ts
│   │   └── audit-log.decorator.ts
│   ├── health-check/
│   │   └── health.controller.ts (database, cache, service status)
│   └── error-handling/
│       ├── global-exception.filter.ts
│       └── sentry.filter.ts
├── prisma/
│   └── schema.prisma (entire data model)
└── main.ts
```

**Critical Endpoints:**
```
GET    /api/health                    # System status
GET    /api/patients/:id              # Patient record
POST   /api/patients                  # Create patient
POST   /api/appointments              # Book appointment
GET    /api/appointments/:id/status   # Check status
POST   /api/agents/receptionist       # Trigger Receptionist agent
POST   /api/agents/appointment-booking # Trigger Booking agent
GET    /api/admin/clinics/:id/config  # Clinic settings
POST   /api/audit-logs/search         # Audit trail search
```

### 3️⃣ FastAPI Agent Layer

**Owns:**
- All 25–35 AI agents (stateful & stateless)
- LLM provider routing (Mistral free tier → OpenAI fallback)
- Document embeddings & RAG search
- Vision/image analysis agents
- LangSmith tracing & LangSmith annotations
- Message history & conversation state (Redis + PostgreSQL)

**Agents Folder Structure:**
```
agent-service/
├── core/
│   ├── config.py (env vars, model names, rate limits)
│   ├── llm_client.py (Mistral/OpenAI router with fallback)
│   ├── db_session.py (PostgreSQL async connection)
│   ├── redis_client.py (cache + conversation state)
│   ├── internal_auth.py (service token validation)
│   ├── tracing.py (LangSmith setup)
│   └── exceptions.py (custom error types)
├── agents/
│   ├── patient_experience/
│   │   ├── receptionist/
│   │   │   ├── router.py
│   │   │   ├── graph.py (LangGraph state machine)
│   │   │   ├── prompts.py
│   │   │   ├── schemas.py
│   │   │   └── test_receptionist.py
│   │   ├── appointment_booking/
│   │   │   ├── router.py
│   │   │   ├── graph.py (multi-turn conversation)
│   │   │   ├── calendar_sync.py (external API calls)
│   │   │   ├── payment_handler.py
│   │   │   └── prompts.py
│   │   ├── reminder/
│   │   │   ├── router.py
│   │   │   ├── service.py (single-shot SMS/email)
│   │   │   └── templates.py
│   │   ├── faq/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── faq_data.json
│   │   └── translation/
│   │       ├── router.py
│   │       └── service.py (Mistral translation free tier)
│   ├── admin_staff/
│   │   ├── medical_records/
│   │   │   ├── router.py
│   │   │   └── service.py
│   │   ├── document_search_rag/
│   │   │   ├── router.py
│   │   │   ├── ingestion.py (PDF/image embedding)
│   │   │   ├── retriever.py (vector search)
│   │   │   └── faiss_index/
│   │   ├── clinical_notes/
│   │   │   ├── router.py
│   │   │   └── service.py
│   │   └── whatsapp_comms/
│   │       ├── router.py
│   │       ├── twilio_handler.py
│   │       └── message_templates.py
│   ├── admin_staff/
│   │   ├── predictive_analytics/
│   │   │   ├── router.py (forecasting, patient lifetime value)
│   │   │   └── models.py
│   │   └── healing_progress/
│   │       ├── router.py
│   │       ├── image_analyzer.py (before/after photos)
│   │       └── prompts.py
├── workers/
│   ├── rabbitmq_consumer.py (listens on job queues)
│   ├── async_reminder_worker.py
│   ├── async_document_ingestion_worker.py
│   └── async_notification_worker.py
├── schemas/
│   ├── agent_request.py (Pydantic models for all agent inputs)
│   └── agent_response.py (standardized output format)
└── main.py (FastAPI app initialization)
```

**LLM Provider Strategy in Code:**
```python
# core/llm_client.py
class LLMClient:
    CRITICALITY_TIERS = {
        "low": "mistral",      # FAQ, translation, general chat
        "high": "openai",      # Risk assessment, clinical notes
        "critical": "openai"   # Payment, surgery risk scores
    }
    
    async def call_agent(self, prompt, tier="low", fallback=True):
        provider = self.CRITICALITY_TIERS.get(tier, "openai")
        try:
            if provider == "mistral":
                return await self.mistral_client.complete(prompt)
        except RateLimitError if fallback:
            # Auto-fallback to OpenAI on free tier limits
            return await self.openai_client.complete(prompt)
        except Exception:
            raise
```

### 4️⃣ Data Layer

**PostgreSQL Schemas (Role-Based Isolation):**
```sql
-- NestJS Service Schema
CREATE SCHEMA nest_business AUTHORIZATION nest_user;
  Tables: patients, appointments, staff, billing, clinics, audit_logs

-- FastAPI Service Schema
CREATE SCHEMA fastapi_agents AUTHORIZATION fastapi_user;
  Tables: agent_conversations, embeddings, medical_documents, 
          agent_execution_logs, rag_indexes

-- Shared Schema
CREATE SCHEMA public;
  Tables: patients (read-only from both), appointments (linked records)
```

**Redis Keys:**
```
sessions::{clinic_id}::{user_id}              # User session (TTL 7 days)
agent_state::{conversation_id}                # Multi-turn agent state (TTL 1 hour)
rate_limit::{ip_address}                      # Rate limit counter (TTL 1 min)
clinic_config::{clinic_id}                    # Cached clinic settings (TTL 1 hour)
embedding_cache::{document_hash}              # Cached embeddings (TTL 7 days)
```

**Cloudflare R2 Bucket Structure:**
```
plastic-surgery-ai-bucket/
├── clinics/{clinic_id}/
│   ├── patient_photos/{patient_id}/
│   │   ├── consultation_{timestamp}.jpg
│   │   ├── before_surgery_{timestamp}.jpg
│   │   └── healing_progress_{timestamp}.jpg
│   ├── medical_records/{patient_id}/
│   │   ├── consent_form_{timestamp}.pdf
│   │   ├── medical_history_{timestamp}.pdf
│   │   └── surgical_plan_{timestamp}.pdf
│   └── documents/
│       └── clinic_branding_{version}.pdf
```

### 5️⃣ Authentication & Authorization Flow

```
┌────────────────────────────────────────────────────────────┐
│ 1. User signs up via Next.js frontend                      │
├────────────────────────────────────────────────────────────┤
│ 2. Clerk handles: password hashing, OAuth, MFA             │
│    Clerk sends webhook → NestJS                            │
├────────────────────────────────────────────────────────────┤
│ 3. NestJS creates user record + assigns default role       │
│    (Patient, Doctor, Admin based on email domain)          │
├────────────────────────────────────────────────────────────┤
│ 4. NestJS generates session JWT (signed with RS256)        │
│    Stored in Redis, returned to client                     │
├────────────────────────────────────────────────────────────┤
│ 5. Every API call includes JWT in Authorization header     │
│    NestJS validates: signature, expiry, user status        │
├────────────────────────────────────────────────────────────┤
│ 6. NestJS applies RBAC rules:                              │
│    • Patient can only see own records                      │
│    • Doctor can see patients in own clinic                 │
│    • Admin can see clinic-wide data                        │
├────────────────────────────────────────────────────────────┤
│ 7. If agent call needed, NestJS generates internal         │
│    service token (HMAC-SHA256) for FastAPI                 │
│    Token includes: timestamp, clinic_id, user_id           │
├────────────────────────────────────────────────────────────┤
│ 8. FastAPI validates service token + reproduces HMAC       │
│    (prevents token spoofing)                               │
└────────────────────────────────────────────────────────────┘
```

**Roles & Permissions Matrix:**
```
┌─────────────────┬─────────┬──────────┬──────────┬───────────┐
│ Resource        │ Patient │ Front    │ Doctor   │ Admin     │
│                 │         │ Desk     │          │           │
├─────────────────┼─────────┼──────────┼──────────┼───────────┤
│ Own Records     │ R/W     │ R        │ R        │ R         │
│ Clinic Records  │ -       │ R        │ R/W      │ R/W       │
│ Billing         │ R       │ W        │ -        │ R/W       │
│ Staff Mgmt      │ -       │ -        │ -        │ R/W       │
│ Agent Logs      │ -       │ -        │ R        │ R/W       │
│ System Config   │ -       │ -        │ -        │ R/W       │
└─────────────────┴─────────┴──────────┴──────────┴───────────┘
```

---

## 📦 Technology Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| **Frontend** | Next.js 14, React 18, TailwindCSS | 14.2+ | SSR support, great DX |
| **Frontend State** | Redux + redux-persist | 4.2+ | Multi-step forms, offline support |
| **Frontend UI** | Ant Design | 5.0+ | Medical dashboard components |
| **Business API** | NestJS, Node.js 22 | 22.0+ | DI, guards, structured modules |
| **ORM** | Prisma | 5.0+ | Type-safe queries, migrations |
| **Agent Orchestration** | FastAPI, Python 3.11+ | 3.11+ | LLM ecosystem maturity |
| **Agent Workflow** | LangGraph | 0.1.0+ | Stateful agent conversations |
| **LLM Clients** | langchain-openai, langchain-mistralai | Latest | Unified provider interface |
| **Database** | PostgreSQL 15 | 15.0+ | ACID, JSON support, extensions |
| **Cache** | Redis | 7.0+ | Sessions, rate-limit buckets, state |
| **Message Queue** | RabbitMQ | 3.12+ | Async jobs (reminders, emails) |
| **File Storage** | Cloudflare R2 | - | Medical photos, off-VPS, redundant |
| **Vector DB** | FAISS (in-app) | Latest | RAG embeddings, no external service |
| **Image Analysis** | Pillow, OpenCV | Latest | Photo analysis agents |
| **Email** | Brevo (SMTP) | - | Transactional emails |
| **SMS/WhatsApp** | Twilio | Latest | Two-way messaging |
| **Payments** | Stripe/PayPal | Latest | Appointment deposits, billing |
| **Monitoring** | Sentry | Latest | Error tracking (NestJS + FastAPI) |
| **Tracing** | LangSmith | Latest | Agent call audit trail |
| **Analytics** | Google Analytics 4, Microsoft Clarity | Latest | User behavior, heatmaps |
| **Push Notifications** | Firebase Cloud Messaging | Latest | Mobile app notifications |
| **Container Runtime** | Docker, Docker Compose | 24.0+ | No Kubernetes needed at this scale |

---

## 🚀 Deployment Guide

### Step 1: VPS Setup

**Recommended Specs:**
- CPU: 4 vCPU (2.5+ GHz)
- RAM: 16 GB
- Storage: 200 GB NVMe SSD
- Bandwidth: 10 Mbps outbound minimum
- OS: Ubuntu 22.04 LTS or AlmaLinux 9

**Initial VPS Commands:**
```bash
# SSH into VPS
ssh root@your_vps_ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/plastic-surgery-ai
cd /opt/plastic-surgery-ai

# Setup firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Create logs directory
mkdir -p logs
```

### Step 2: Clone & Configure

```bash
# Clone repository
git clone https://github.com/your-org/plastic-surgery-ai.git .
git lfs pull

# Copy environment files
cp .env.example .env
cp .env.docker.example .env.docker

# Edit .env with your secrets
nano .env
```

**.env Template:**
```env
# CLINIC CONFIG
CLINIC_NAME=Your Clinic
CLINIC_TIMEZONE=Asia/Karachi

# CLERK AUTH
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# DATABASE
DATABASE_URL=postgresql://nest_user:password@postgres:5432/plastic_surgery_db
REDIS_URL=redis://redis:6379

# RABBITMQ
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=secure_password
RABBITMQ_URL=amqp://admin:secure_password@rabbitmq:5672

# LLM PROVIDERS
MISTRAL_API_KEY=your_mistral_key
OPENAI_API_KEY=your_openai_key
LANGSMITH_API_KEY=your_langsmith_key

# STORAGE
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
R2_BUCKET_NAME=plastic-surgery-ai

# THIRD PARTIES
CLERK_WEBHOOK_SECRET=whsec_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
BREVO_API_KEY=your_brevo_key

# MONITORING
SENTRY_DSN_NESTJS=https://xxxx@sentry.io/xxxx
SENTRY_DSN_FASTAPI=https://xxxx@sentry.io/xxxx

# SECURITY
INTERNAL_SERVICE_TOKEN=generate_with: openssl rand -hex 32
JWT_SECRET=generate_with: openssl rand -hex 32
ENCRYPTION_KEY=generate_with: openssl rand -hex 32

# ENVIRONMENT
NODE_ENV=production
PYTHON_ENV=production
```

### Step 3: Deploy with Docker Compose

**docker-compose.yml Overview:**
```yaml
version: '3.9'

services:
  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: nest_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: plastic_surgery_db
    ports:
      - "5432:5432"  # internal only
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nest_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Cache & Sessions
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"  # internal only
    volumes:
      - redis_data:/data
    networks:
      - app_network
    command: redis-server --appendonly yes
    restart: unless-stopped

  # Message Queue
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_DEFAULT_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_DEFAULT_PASS}
    ports:
      - "5672:5672"  # internal AMQP
      - "15672:15672" # management UI (block from public)
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - app_network
    restart: unless-stopped

  # Business API
  api-service:
    build:
      context: ./api-service
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      INTERNAL_SERVICE_TOKEN: ${INTERNAL_SERVICE_TOKEN}
      CLERK_SECRET_KEY: ${CLERK_SECRET_KEY}
    ports:
      - "3001:3001"  # internal only
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - app_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Agent Service
  agent-service:
    build:
      context: ./agent-service
      dockerfile: Dockerfile
    environment:
      PYTHON_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      INTERNAL_SERVICE_TOKEN: ${INTERNAL_SERVICE_TOKEN}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      MISTRAL_API_KEY: ${MISTRAL_API_KEY}
    ports:
      - "8000:8000"  # internal only
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - app_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro  # SSL certs from Cloudflare
    depends_on:
      - api-service
    networks:
      - app_network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:

networks:
  app_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.22.0.0/16  # Internal network, not routable
```

**Deploy:**
```bash
# Pull latest code
git pull origin main

# Pull Docker images
docker compose pull

# Start services (with database migrations)
docker compose up -d
docker compose exec api-service npm run prisma:migrate:deploy

# Check logs
docker compose logs -f --tail=50

# Verify health
curl http://localhost:3001/health
curl http://localhost:8000/health
```

### Step 4: Database Migrations

```bash
# Generate migration
docker compose exec api-service npx prisma migrate dev --name add_field_name

# Deploy migration
docker compose exec api-service npx prisma migrate deploy

# Check migration status
docker compose exec api-service npx prisma migrate status
```

### Step 5: CI/CD with GitHub Actions

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: |
          docker build -t plastic-surgery-api:latest ./api-service
          docker build -t plastic-surgery-agents:latest ./agent-service
      
      - name: Login to Docker Registry
        run: |
          echo ${{ secrets.DOCKER_REGISTRY_PASSWORD }} | docker login \
            -u ${{ secrets.DOCKER_REGISTRY_USER }} --password-stdin
      
      - name: Push images
        run: |
          docker tag plastic-surgery-api:latest registry/plastic-surgery-api:latest
          docker tag plastic-surgery-agents:latest registry/plastic-surgery-agents:latest
          docker push registry/plastic-surgery-api:latest
          docker push registry/plastic-surgery-agents:latest
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ubuntu
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/plastic-surgery-ai
            git pull origin main
            docker compose pull
            docker compose up -d
            docker compose logs --tail=50
```

---

## 🔐 Security & Compliance

### HIPAA Compliance Checklist

**Data Protection:**
- ✅ Encryption at rest: All patient data encrypted with AES-256 (encryption_service.ts)
- ✅ Encryption in transit: TLS 1.3 for all connections (Cloudflare + Nginx)
- ✅ Database encryption: PostgreSQL pgcrypto extension for sensitive fields
- ✅ File encryption: Patient photos encrypted before upload to R2
- ✅ Key rotation: Master key rotated monthly, logged to audit trail

**Access Controls:**
- ✅ Role-based access control (RBAC) with clinic-level scoping
- ✅ Multi-factor authentication (MFA) enforced for staff
- ✅ Session timeout: 30 minutes for doctors, 8 hours for patients
- ✅ Audit logging: Every data access logged (user, timestamp, action, result)
- ✅ Account lockout: 5 failed attempts → 30-minute lockout

**Data Integrity:**
- ✅ ACID transactions: PostgreSQL enforces referential integrity
- ✅ Audit trail: 7-year retention of all record modifications
- ✅ Backup integrity: Daily backups verified with checksums
- ✅ Data validation: Prisma schema enforces type safety

**Incident Response:**
- ✅ Breach notification: Automatic Slack alert + email to compliance officer
- ✅ Breach log: All incidents recorded in dedicated breach_incidents table
- ✅ Evidence preservation: Sentry captures full stack trace + user context
- ✅ Recovery: Automated failover to backup database within 5 minutes

**Business Associates Agreement (BAA):**
Before using in production with US patients, **require BAA from:**
- Clerk (authentication)
- Cloudflare R2 (file storage)
- Sentry (error monitoring)
- LangSmith (agent tracing)
- Stripe/PayPal (payments)

```bash
# Check BAA status
curl https://www.clerk.com/compliance  # BAA available
curl https://www.cloudflare.com/hipaa  # BAA available
```

### Data Privacy by Design

**PII Encryption Policy:**
```python
# Every patient record field marked as sensitive is encrypted
class Patient(Base):
    __tablename__ = "patients"
    
    id: UUID = Column(UUID, primary_key=True)
    clinic_id: UUID = Column(UUID, ForeignKey("clinics.id"))
    
    # Plaintext (indexed, searchable)
    first_name: str = Column(String, index=True)
    last_name: str = Column(String, index=True)
    
    # Encrypted (not searchable without decryption)
    ssn: str = Column(String, nullable=True)  # encrypted by encryption_service.ts
    phone: str = Column(String, nullable=True)  # encrypted
    email: str = Column(String, nullable=True)  # encrypted
    
    # Medical data (always encrypted)
    medical_history: str = Column(Text)  # encrypted JSON
    allergies: str = Column(Text)  # encrypted array
```

**Data Deletion:**
```
Patient requests deletion via patient portal
  ↓
Deletion request logged in audit_logs (immutable)
  ↓
NestJS marks record as deleted_at = NOW()
  ↓
Patient record hidden from all queries (soft delete)
  ↓
Photos/documents in R2 deleted immediately
  ↓
Database record purged after 30-day retention period
  ↓
Audit log entry expires after 7 years (HIPAA requirement)
```

### SQL Injection & XSS Prevention

**NestJS:**
- ✅ Prisma ORM: Parameterized queries, no string interpolation
- ✅ Input validation: Zod schemas on every endpoint
- ✅ HTML escaping: DOMPurify on Next.js rendering
- ✅ CORS: Whitelist only your domain

**FastAPI:**
- ✅ Pydantic models: Type-safe request validation
- ✅ SQL Alchemy ORM: Parameterized queries
- ✅ Response validation: Every response checked against schema

### Rate Limiting & DDoS

**Nginx Rate Limit:**
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;

server {
    location /api {
        limit_req zone=api burst=500 nodelay;
    }
}
```

**Redis Rate Limit (per endpoint):**
```typescript
// NestJS rate-limiter.middleware.ts
@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  async use(req, res, next) {
    const key = `ratelimit:${req.ip}:${req.path}`;
    const count = await redis.incr(key);
    await redis.expire(key, 60);
    
    if (count > 100) {
      throw new TooManyRequestsException();
    }
    next();
  }
}
```

**Cloudflare DDoS:**
- ✅ WAF rules: Block suspicious traffic patterns
- ✅ Rate limiting: 100 req/IP/second
- ✅ Bot management: Challenge suspicious bots
- ✅ CAPTCHA: Trigger on spike detection

---

## 📊 Operational Runbook

### Daily Checks (Morning)

```bash
#!/bin/bash
# daily_health_check.sh

echo "=== Plastic Surgery AI OS Health Check ==="
date

# Check all services running
docker compose ps
if [ $? -ne 0 ]; then
  echo "❌ Some services not running!"
  exit 1
fi

# Check disk space
disk_usage=$(df / | awk 'NR==2 {print $5}' | cut -d'%' -f1)
if [ $disk_usage -gt 85 ]; then
  echo "⚠️  Disk usage high: ${disk_usage}%"
fi

# Check database
docker compose exec postgres psql -U nest_user -d plastic_surgery_db -c "SELECT COUNT(*) FROM patients;"
if [ $? -ne 0 ]; then
  echo "❌ Database connection failed!"
  exit 1
fi

# Check Redis
docker compose exec redis redis-cli ping
if [ $? -ne 0 ]; then
  echo "❌ Redis connection failed!"
  exit 1
fi

# Check backup status
if [ ! -f "backups/daily_$(date +%Y-%m-%d).sql.gz" ]; then
  echo "⚠️  Today's backup not found"
fi

echo "✅ All systems operational"
```

### Weekly Maintenance

```bash
#!/bin/bash
# weekly_maintenance.sh

# 1. Clean up old logs
find logs -name "*.log" -mtime +30 -delete

# 2. Optimize PostgreSQL
docker compose exec postgres vacuumdb -U nest_user plastic_surgery_db

# 3. Check for security updates
docker pull postgres:15-alpine
docker pull redis:7-alpine
docker pull rabbitmq:3.12-management-alpine

# 4. Review error logs
docker compose logs --since 7 days | grep ERROR | tail -20

# 5. Test backup restoration
# (on staging only)
docker compose -f docker-compose.backup-test.yml up -d
docker compose -f docker-compose.backup-test.yml exec postgres \
  psql -U nest_user -d plastic_surgery_db -f /backups/latest.sql
```

### Monthly Tasks

1. **Security audit:**
   - Review audit logs for suspicious activity
   - Check user role assignments
   - Verify MFA status for all staff

2. **Performance review:**
   - Check Sentry error trends
   - Review slow database queries (>1s)
   - Analyze LangSmith agent performance

3. **Compliance:**
   - Verify HIPAA BAA status with vendors
   - Review data deletion requests
   - Update privacy policy if needed

4. **Capacity planning:**
   - Monitor CPU/RAM/disk utilization
   - Forecast growth (add vCPU/RAM if >70% sustained)
   - Review R2 bandwidth costs

### Troubleshooting Guide

**Problem: Database slow queries**
```bash
# Check slow query log
docker compose exec postgres psql -U nest_user -d plastic_surgery_db -c "
  SELECT query, calls, mean_time 
  FROM pg_stat_statements 
  WHERE mean_time > 1000 
  ORDER BY mean_time DESC 
  LIMIT 10;
"

# Add index if needed
docker compose exec postgres psql -U nest_user -d plastic_surgery_db -c "
  CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
"
```

**Problem: FastAPI agent timeout**
```bash
# Check agent logs
docker compose logs agent-service --tail=100 | grep ERROR

# Restart agent service
docker compose restart agent-service

# Check LangSmith traces
# Go to https://smith.langchain.com/o/xxx/hub and check recent runs
```

**Problem: High memory usage**
```bash
# Check which service
docker compose stats

# Restart the problematic service
docker compose restart api-service

# Check Node.js heap (if API service)
docker compose exec api-service node --inspect=0.0.0.0:9229 dist/main.js
```

**Problem: LLM API errors**
```bash
# Check provider status
curl https://status.openai.com
curl https://status.mistral.ai

# Manually test LLM client
docker compose exec agent-service python -c "
  from core.llm_client import LLMClient
  client = LLMClient()
  print(await client.call_agent('Hello', tier='low'))
"
```

---

## 📈 Scaling Strategy

### Phase 1: Current (Single VPS, ~5K patients)
- 4 vCPU, 16 GB RAM
- Single PostgreSQL instance
- Redis on same machine
- ~100 concurrent users

### Phase 2: ~20K patients
**Trigger:** CPU >70% sustained, DB >3GB
```
Remove: Everything on single VPS
Add: 
  - Managed RDS (PostgreSQL Multi-AZ)
  - Managed ElastiCache (Redis cluster)
  - Second VPS for API services
  - RabbitMQ on dedicated small instance
```

### Phase 3: ~100K patients
**Trigger:** API response times >500ms, agent latency >2s
```
Add:
  - API service horizontal scaling (load balancer)
  - Agent service horizontal scaling
  - FastAPI model caching with Redis
  - Separate read replicas for reporting
```

### Phase 4: Enterprise (1M+ patients)
```
Move to:
  - Kubernetes cluster (self-managed or EKS/GKE)
  - Distributed PostgreSQL (Citus or Vitess)
  - Separate LLM inference servers
  - Vector database (Pinecone or Qdrant)
```

---

## 📝 Key Improvements Needed for Production

### 🔴 CRITICAL (Fix Before Launch)

1. **HIPAA Business Associates:** Get signed BAAs from all data processors
2. **Load Testing:** Mistral free tier stress test (100 concurrent users)
3. **Disaster Recovery:** Test backup restore procedure
4. **Secrets Management:** Move from .env files to AWS Secrets Manager or HashiCorp Vault
5. **Database Backups:** Verify daily backups are happening and can be restored

### 🟡 IMPORTANT (Fix in v1.1)

6. **API Versioning:** Implement /v1/, /v2/ endpoints for future compatibility
7. **API Documentation:** Auto-generate OpenAPI/Swagger docs from Zod schemas
8. **Monitoring Dashboards:** Grafana dashboard for CPU/RAM/Disk/Network
9. **Alerting:** PagerDuty integration for critical errors
10. **Log Aggregation:** ELK stack or CloudWatch for centralized logging
11. **Payment Processing:** Implement PCI-compliant payment handling (use Stripe Payment Element)
12. **Multi-clinic Isolation:** Verify complete data isolation between clinics (test with 2 simultaneous clinics)

### 🟢 NICE TO HAVE (v1.2+)

13. **Dark Mode:** Frontend dark theme
14. **Mobile App:** React Native app using same API
15. **Advanced Analytics:** Clinic revenue forecasting, patient LTV prediction
16. **Webhook System:** Allow clinics to create custom integrations
17. **White-label:** Allow clinics to brand the system with own logo/colors

---

## 📞 Support & Escalation

### On-Call Engineer Responsibilities

**Level 1 (24h response):**
- Database size >90% of storage
- Sentry error rate >5%
- LangSmith agent failure rate >10%

**Level 2 (4h response):**
- API response time >2 seconds
- FastAPI service down
- Authentication failures

**Level 3 (1h response):**
- Patient data visible to wrong clinic
- Payment processing down
- Database unavailable

**Escalation Tree:**
```
Automated Alert (Sentry/PagerDuty)
  ↓
On-call Engineer (Slack @oncall)
  ↓
Engineering Lead
  ↓
VP Engineering
  ↓
CEO + Legal (if data breach suspected)
```

---

## 🎯 Success Metrics

Track these KPIs weekly:

```
System Uptime:           99.5% target (max 3.6 hrs downtime/month)
API Response Time:       <200ms p95
Agent Response Time:     <5s p95
Error Rate:              <0.1% of requests
Patient Satisfaction:    >4.5/5 (NPS survey)
Staff Satisfaction:      >4.0/5 (internal survey)
Cost per Patient:        <$5/month (infrastructure)
```

---

## 📚 Additional Resources

- **Prisma Docs:** https://www.prisma.io/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com
- **LangGraph:** https://python.langchain.com/docs/langgraph
- **NestJS Docs:** https://docs.nestjs.com
- **PostgreSQL Tuning:** https://wiki.postgresql.org/wiki/Performance_Optimization
- **Docker Security:** https://docs.docker.com/engine/security
- **HIPAA Compliance:** https://www.hhs.gov/hipaa/for-professionals

---

**Document Version:** 1.0  
**Last Updated:** July 2026  
**Next Review:** January 2027  
**Owner:** Engineering Lead
