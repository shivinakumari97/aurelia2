# Aurelia — The AI-Native Event Operating System

Aurelia is a full-stack, multi-tenant SaaS platform that acts as the operating
system for modern event companies. It replaces spreadsheets with AI: predicting
costs, optimizing seating, classifying RSVPs, and turning every event into
compounding, organization-private intelligence.

It is designed to be **extensible for both B2B and B2C** — an organization can be
an event agency (company) or a single planner (individual).

> **Status — Milestone 1 (foundation).** The architecture, security model, data
> model, AI service layer, auth, and the end-to-end 8-step event wizard are
> implemented and verified. Deep external integrations (live Stripe, WhatsApp,
> Google Workspace, PDF-vision) are wired as clean interfaces with deterministic
> fallbacks, ready to connect. See [Roadmap](#roadmap).

---

## Stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Framework  | Next.js 15 (App Router) — web + API + PWA in one codebase     |
| Language   | TypeScript (strict)                                           |
| Database   | PostgreSQL via Prisma ORM                                     |
| Auth       | JWT access tokens (`jose`) + rotating refresh tokens          |
| AI         | Anthropic Claude with deterministic fallbacks                 |
| Styling    | Tailwind CSS — the "Aurelia" luxury design system             |
| Validation | Zod                                                           |
| Tests      | Vitest                                                        |

A single Next.js deployment serves the responsive web app and an installable
**PWA** (`/manifest.webmanifest`) for iOS/Android. The backend is stateless
(route handlers), enabling horizontal scaling behind a load balancer.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Start Postgres (Docker)
docker compose up -d db

# 3. Configure env
cp .env.example .env
#   For production set JWT_ACCESS_SECRET and FIELD_ENCRYPTION_KEY:
#     openssl rand -base64 48   # JWT_ACCESS_SECRET
#     openssl rand -base64 32   # FIELD_ENCRYPTION_KEY (must be 32 bytes)
#   In development these fall back to insecure dev defaults automatically.

# 4. Create schema + seed demo data
npm run db:push
npm run db:seed

# 5. Run
npm run dev   # http://localhost:3000
```

**Demo credentials** (from the seed):

- Admin: `admin@acme.events` / `Password123`
- Associate (read-only ops role): `ops@acme.events` / `Password123`

Without an `ANTHROPIC_API_KEY`, every AI feature still works using deterministic
heuristics (venue scoring, cost modeling, RSVP classification, seating). Add the
key to enable LLM-refined reasoning summaries and classification.

### Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Dev server                           |
| `npm run build`    | `prisma generate` + production build |
| `npm run test`     | Vitest unit tests                    |
| `npm run typecheck`| `tsc --noEmit`                       |
| `npm run db:push`  | Sync schema to the database          |
| `npm run db:seed`  | Seed demo organization + data        |
| `npm run db:studio`| Prisma Studio                        |

---

## Architecture

### Multi-tenancy & isolation

Every tenant-owned row carries `organizationId`. All queries are scoped to the
caller's organization in `src/lib/auth/session.ts` + the API handlers. There is
no cross-organization data exposure — verified by tests and the smoke suite
(an associate in one org receives `404` for another org's resources).

### Security & compliance

- **Transport:** HSTS + security headers (`next.config.mjs`); TLS terminates at the platform edge.
- **At rest:** AES-256-GCM **field-level encryption** for sensitive data — guest
  contact details, dietary restrictions, financial amounts, vendor contracts
  (`src/lib/crypto/field-encryption.ts`). A plaintext rounded `amountBucket` is
  retained for aggregation without bulk decryption.
- **Passwords:** bcrypt (cost 12).
- **Auth:** short-lived JWT access tokens + **refresh-token rotation** with reuse
  detection (a replayed revoked token revokes the whole chain).
- **RBAC:** org-scoped roles with **granular per-workflow-step permissions**
  (`src/lib/auth/rbac.ts`). Admins see everything; associates default to read-only.
- **Hardening:** Zod input validation, in-memory rate limiting (Redis-swappable),
  consistent error envelopes.
- **Compliance:** append-only **audit logs** (financial + permission changes),
  **GDPR data export** (`/api/compliance/export`), consent tracking model.

### AI service layer (`src/lib/ai/`)

Organization-scoped, never cross-tenant. Each capability has a deterministic core
(always available, unit-tested) and an optional LLM refinement:

| Module                | Capability                                                  |
| --------------------- | ----------------------------------------------------------- |
| `venue-matching.ts`   | Rank venues by budget/capacity/location with reasoning      |
| `cost-prediction.ts`  | Category cost breakdown, confidence, risk flags, history    |
| `rsvp-classifier.ts`  | Yes/No/Maybe/Ambiguous + dietary extraction + follow-ups    |
| `seating.ts`          | Group/hierarchy/dietary-aware seating optimization          |
| `post-event.ts`       | Budget variance, attendance, improvement suggestions        |

AI usage is metered per organization (`aiCreditsUsed/Limit`) to support tiered billing.

---

## The 8-step event wizard

A page-by-page flow (`/events/[id]`) that resumes from the saved `currentStep`:

1. **Venue** — select from inventory or AI-rank with an editable prompt
2. **Financials** — AI cost breakdown, confidence, risk flags (persisted, encrypted)
3. **Floor plans** — upload + revision history *(storage/vision interface ready)*
4. **Workspace** — built-in task management *(Google Workspace hook ready)*
5. **RSVPs** — CSV import, AI reply classification, dietary extraction
6. **Table planning** — auto-optimized seating, capacity-aware
7. **Itinerary** — versioned day-of schedule + menu
8. **Closure** — end event → AI post-event report; financials retained for future predictions

---

## Data model

Normalized relational schema (`prisma/schema.prisma`) with indexing for scale:
`Organization, User, Role, RefreshToken, Venue, Vendor, FloorPlan, Event, Guest,
FinancialRecord, EventTable, Task, Itinerary, PostEventReport, AuditLog,
ConsentRecord`.

---

## Monetization & data moat

- Subscription tiers (Starter / Professional / Enterprise) with per-tier AI limits.
- Organization-level billing fields (Stripe customer/subscription) on `Organization`.
- Per-event pricing supported by the model.
- Opt-in (off by default) anonymized benchmarking for an industry data moat;
  org-specific history already improves cost predictions.

---

## Roadmap

Interfaces exist; these connect external services:

- Stripe billing (checkout, webhooks, metered usage)
- WhatsApp / email RSVP delivery + inbound webhooks
- Google Workspace read-only sync
- S3-equivalent object storage + PDF-vision floor-plan parsing
- pgvector for embedding-based venue/vendor matching
- Background queue (BullMQ/SQS) for async AI jobs, scheduled auto-close
- 2FA (TOTP) enforcement for admins (schema fields present)
- Vendor marketplace, payment escrow, white-label theming

---

## Design language

"Aurelia" — refined editorial luxury: aureate **gold** accents, deep **ink**
neutrals, **parchment** surfaces, an elegant serif display (Playfair Display)
paired with a clean sans (Inter). Tokens live in `tailwind.config.ts`.
