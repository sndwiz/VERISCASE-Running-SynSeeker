# VERICASE — Legal Practice Management Platform

AI-powered legal practice management system with evidence analysis, case management, billing, document generation, and investigative tools.

## Tech Stack

- **Frontend**: React 18, Vite 7, Tailwind CSS, shadcn/ui, wouter (routing)
- **Backend**: Express 5, TypeScript, Socket.io (real-time)
- **Database**: PostgreSQL with Drizzle ORM
- **AI Providers**: Anthropic (Claude), OpenAI, Google Gemini, DeepSeek

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- API keys for at least one AI provider (Anthropic recommended)

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/sndwiz/VERISCASE-Running-SynSeeker.git
cd VERISCASE-Running-SynSeeker
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values. See `.env.example` for all required and optional variables.

### 3. Database

Create a PostgreSQL database and set `DATABASE_URL` in your `.env`:

```bash
createdb vericase
```

Push the schema:

```bash
npm run db:push
```

### 4. Run

```bash
# Development (Vite dev server + Express)
npm run dev

# Production build
npm run build
npm start
```

The app runs on port `5000` by default.

## Project Structure

```
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Shared UI components
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utilities & API client
│       └── pages/          # Route pages (45+)
├── server/                 # Express backend
│   ├── ai/                 # AI provider abstraction & ops tracking
│   ├── config/             # Core doctrine, model registry, policy engine
│   ├── routes/             # API route modules (40+)
│   ├── security/           # Middleware, audit, session tracking
│   ├── storage/            # Modular database access layer (Drizzle)
│   └── index.ts            # Server entry point
├── shared/                 # Shared types & schema
│   ├── models/             # Drizzle table definitions
│   └── schema.ts           # Schema exports & UI config
└── drizzle.config.ts       # Drizzle ORM configuration
```

## Core Modules

| Module | Description |
|---|---|
| **Boards & Tasks** | Kanban-style project management with groups, tasks, automations |
| **Matters & Clients** | Full client/matter lifecycle management |
| **Evidence Vault** | Secure evidence storage with chain of custody tracking |
| **Detective Board** | Visual investigation tool with node-based relationship mapping |
| **Verbo / AI Chat** | Multi-provider AI assistant with legal analysis doctrine |
| **Clawbot** | Specialized legal research AI |
| **Billing** | Time entries, expenses, invoices, payments, trust accounting |
| **Document Wash** | Document sanitization and metadata scrubbing |
| **PDF Pro / Forensics** | PDF generation, analysis, and forensic examination |
| **E-Filing** | Electronic court filing preparation |
| **Email Intel** | Email analysis and contact extraction |
| **Video Pipeline** | Legal video processing and analysis |
| **Templates** | Document templates (civil litigation, PI/tort, discovery, settlement) |

## AI Architecture

VERICASE uses a multi-provider AI system governed by the **Core Doctrine**:

- **Prime Directive**: "Evidence Over Vibes" — separate observations from inferences
- All AI outputs require citations with asset references, confidence scores (0-1), and alternative explanations
- Multi-hypothesis methodology: maintain competing theories, update confidence as evidence arrives
- Non-negotiables: no hallucinations, explicit observed vs. inferred, audit trails

Supported providers are configured in `server/ai/providers.ts` with model selection managed by `server/config/model-registry.ts`.

## Security

- **RBAC**: Three-tier access control (Admin, Member, Viewer) on all API routes
- **Scanner Traps**: 40+ honeypot paths detect vulnerability scanners
- **Rate Limiting**: Form submission throttling (10/10min)
- **Helmet**: Security headers on all responses
- **Audit Logging**: All significant actions logged with user/IP tracking
- **Session Tracking**: IP-based session monitoring

## Database

80+ PostgreSQL tables managed via Drizzle ORM. Key domains:

- Boards, Groups, Tasks
- Clients, Matters, Matter Contacts, Matter Documents
- Evidence Vault, OCR Jobs, Timeline Events
- AI Conversations, AI Messages
- Detective Nodes, Automation Rules
- Time Entries, Expenses, Invoices, Payments, Trust Transactions
- Calendar Events, Meetings, Approvals
- Audit Logs, Security Events
- Document Templates, Generated Documents
- PDF Documents, Filing Tags, File Items

Connection pooling: max 20 connections, 30s idle timeout, 5s connection timeout.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes* | Claude API key |
| `OPENAI_API_KEY` | Optional | GPT API key |
| `GOOGLE_AI_API_KEY` | Optional | Gemini API key |
| `DEEPSEEK_API_KEY` | Optional | DeepSeek API key |
| `SESSION_SECRET` | Yes | Express session secret |
| `NODE_ENV` | Optional | `development` or `production` |

*At least one AI provider key is required for AI features.

## License

Proprietary. All rights reserved.
