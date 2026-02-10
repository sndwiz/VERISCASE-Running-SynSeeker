# VERICASE - Legal Practice OS

## Overview
VERICASE is a comprehensive legal practice management system designed to streamline legal workflows with a Monday.com-style board interface. It offers AI-powered document analysis, secure evidence management, investigative tools, multi-user authentication, and extensive legal practice management features. The system aims to provide a robust, AI-enhanced platform for legal professionals, improving efficiency and case management capabilities.

## Core Doctrine
**"Totality of the circumstances, measured — then argued."**
VERICASE turns messy case materials into structured, defensible insight without hallucinating facts. Every document is treated as evidence with (1) content, (2) context, (3) reliability, and (4) relationship to other evidence. The system reveals patterns, contradictions, and narrative leverage while preserving chain-of-custody thinking and legal relevance.

**Doctrine Architecture:**
- `server/config/core-doctrine.ts` — Centralized doctrine module with shared system prompts referenced by all AI touchpoints
- `server/config/DOCTRINE.md` — Full doctrine reference document
- All AI prompts (OCR, insights analysis, VeriBot, legal research) import and use doctrine preambles
- Doctrine principles: Evidence Over Vibes, Competing Hypotheses (H0/H1), Convergence Analysis, Reliability Scoring (Strong/Moderate/Weak), Legal Element Mapping, Observed vs Inferred labeling, Source Independence checking

## User Preferences
- Dark/light theme toggle in header
- Professional legal-focused design
- Clean, modern interface

## System Architecture
VERICASE is built with a modern web stack, featuring React 18 with TypeScript for the frontend, and Node.js with Express for the backend. PostgreSQL with Drizzle ORM handles data persistence.

**UI/UX Decisions:**
The system adopts a Monday.com-style board architecture, offering highly customizable boards with over 15 column types, dynamic column management, and group summary rows. An "Approval Column" supports legal verification workflows. The interface includes a collapsible sidebar, theme support (dark/light mode with teal accents), and is designed to be responsive. Shadcn/ui and Radix UI components, styled with Tailwind CSS, ensure a consistent and modern aesthetic.

**Technical Implementations:**
- **Board System:** Customizable boards with task groups and various column types. Boards support optional `clientId` and `matterId` for linking to specific clients and cases. New matters automatically get a linked board with 8 preset groups (Waiting, Tasks, Motions, Filings, Files, In Progress, Stuck, Finished) and automatic status-based group movement automations. Completed items (10+) auto-collapse in group views. Admin-only task deletion protection via RBAC.
- **Vibe Code (AI App Builder):** An AI-powered board builder at `/vibe-code` where users can use natural language prompts to generate boards, or select from 18 pre-built legal-focused templates.
- **AI Integration (VeriBot):** A multi-model AI assistant for legal document analysis, content generation, and summarization, with matter-specific context.
- **Clawbot Gateway Integration:** Connects to OpenClaw/Clawbot for autonomous computer control via natural language.
- **Document & Form Maker:** AI-powered Utah legal document generation system with 5+ templates, URCP compliance checking, and a lawyer approval workflow.
- **Daily Briefing:** A personalized dashboard with task summaries, deadlines, and matter updates.
- **Filing Cabinet:** A two-layer document classification system with controlled vocabulary and Bates numbering.
- **Evidence Vault:** Immutable file storage with SHA-256 chain-of-custody tracking.
- **Detective Board:** A visual investigation board implementing the doctrine's Entity + Event Graph. Supports 10 node types (evidence, person, organization, location, event, theory, hypothesis, legal_element, timeline_marker, note) with confidence scores, reliability ratings (Strong/Moderate/Weak), and observed/inferred labeling. 8 connection types (related, contradicts, supports, corroborates, leads-to, timeline, communicates, references) with evidence citations and independence tracking.
- **Automations:** Event-driven automation engine with 85+ pre-built templates, AI-powered actions, and a Workflow Recorder to suggest automations.
- **SynSeekr Integration:** Hybrid AI architecture connecting to a self-hosted SynSeekr server for advanced AI capabilities (document analysis, entity extraction, RAG queries, investigations, contradiction detection, timeline extraction, AI agents). Includes 12 SynSeekr automation templates.
- **Communications Hub:** Clio-style communications center at `/communications` for client portals, SMS messaging, internal team communication, and activity logs.
- **Legal AI Workspace (VeriBot):** Clio Work/Vincent-style AI-powered legal workspace at `/legal-ai` with conversational AI, a template library, and generated document drafting. Features 14 legal workflow cards.
- **Client Intake Forms:** Clio Grow-style intake form system at `/intake-forms` with 6 pre-built templates.
- **Matter Insights:** OCR-first evidence intelligence system in matter detail views. Supports file upload, text extraction, SHA-256 hashing, and AI-powered analysis (themes, timeline, entities, contradictions, action items, risks) with document citations. Includes OCR session tracking with detailed processing reports (timestamps, method, provider, confidence, processing time, page counts, text statistics) and an OCR Processing tab in matter detail views. Documents auto-create tasks in the board's Files group upon processing completion.
- **Matter Management:** Comprehensive lifecycle management for matters and clients.
- **Billing System:** Complete firm billing infrastructure with expenses, invoices, payments, and trust transactions, accessible via master, client, and matter-specific dashboards.
- **Billing Verifier:** Client-side time entry verification and invoice preparation system at `/billing-verifier`. Features CSV/JSON import, settings for firm info/rates/rules, results summary, daily aggregations, adjustments, review, and various export options. Includes UTBMS code detection and quality checking.
- **Template Library:** Email intelligence template system at `/templates` with 5 types and 20 pre-built legal email templates across 12 categories.
- **Process Recorder:** Workflow capture system that records app events and converts them to automations, macros, or SOPs.
- **Help System & Tooltips:** Centralized feature metadata library providing tooltips, descriptions, and searchable feature guides with "Ask VeriBot" integration.
- **AI Operations Monitor:** In-memory AI usage tracking system for cost, latency, and performance monitoring of AI operations, with an admin-only dashboard.
- **PDF Pro:** Advanced legal document processing module at `/pdf-pro` with matter-scoped PDF management. Features: PDF upload with SHA-256 integrity hashing, async job queue (OCR, Bates numbering, confidentiality stamps, PII wash/detection), document version tracking with chain-of-custody, Bates set management with auto-incrementing numbering and range tracking, PII detection via regex (SSN, phone, email, DOB, credit cards), and wash reports.
- **Legal Research:** Deep AI-powered legal research feature at `/legal-research`. Multi-step research pipeline using Claude: query planning (5 research steps), sequential step execution with live SSE progress streaming, and final compilation into structured legal memo.
- **Unified Calendar Sync:** Calendar events auto-sync from 7 entity types (e-filing deadlines, case actions, filings, board tasks, meetings, invoices, approvals) via sourceType/sourceId tracking.
- **Cross-Entity Data Linkage System:** Backend where all entities (clients, matters, contacts, billing, time entries, boards, evidence) are interconnected, with new endpoints for client/matter-specific data and a master spreadsheet view.
- **Workspace Architecture:** Supports multiple workspaces with independent boards and data.
- **E-Filing Automation Brain:** Comprehensive legal document automation system at `/efiling`. Includes AI-powered document classifier, rules-based deadline engine, and sequencing engine for next-best-actions.

**System Design Choices:**
- **Authentication:** Multi-user authentication via Replit Auth (Google, GitHub, Apple, email).
- **Role-Based Access Control (RBAC):** Three-tier role system (admin, member, viewer) for route-level permissions.
- **Data Storage:** PostgreSQL with Drizzle ORM for relational data; in-memory store for temporary data.
- **API Design:** RESTful JSON API with a modular Express route architecture.
- **Cloudflare Security Hardening:** Comprehensive security layer including scanner tripwire traps, Cloudflare Turnstile verification, dedicated form rate limiters, trust proxy, custom domain CORS support, and CSP directives.

## External Dependencies
- **Replit Auth:** For multi-user authentication.
- **PostgreSQL:** Primary database.
- **Drizzle ORM:** ORM for PostgreSQL.
- **Anthropic Claude, OpenAI GPT, Google Gemini:** AI models for VeriBot.
- **Wouter:** Frontend routing.
- **TanStack React Query:** Frontend server state management.
- **shadcn/ui + Radix UI:** UI component libraries.
- **Tailwind CSS:** Frontend styling.
- **React Hook Form with Zod:** Form management and validation.
- **connect-pg-simple:** PostgreSQL-based session storage.
- **pdf-lib:** For PDF manipulation in the PDF Pro module.
- **multer:** For file uploads in the PDF Pro module.