# VERICASE - Legal Practice OS

## Overview
VERICASE is a comprehensive legal practice management system designed to streamline legal workflows with a Monday.com-style board interface. It offers AI-powered document analysis, secure evidence management, investigative tools, multi-user authentication, and extensive legal practice management features. The system aims to provide a robust, AI-enhanced platform for legal professionals, improving efficiency and case management capabilities.

## User Preferences
- Dark/light theme toggle in header
- Professional legal-focused design
- Clean, modern interface

## System Architecture
VERICASE is built with a modern web stack, featuring React 18 with TypeScript for the frontend, and Node.js with Express for the backend. PostgreSQL with Drizzle ORM handles data persistence.

**UI/UX Decisions:**
The system adopts a Monday.com-style board architecture, offering highly customizable boards with over 15 column types, dynamic column management, and group summary rows. An "Approval Column" supports legal verification workflows. The interface includes a collapsible sidebar, theme support (dark/light mode with teal accents), and is designed to be responsive. Shadcn/ui and Radix UI components, styled with Tailwind CSS, ensure a consistent and modern aesthetic.

**Technical Implementations:**
- **Board System:** Customizable boards with task groups and various column types. Boards support optional `clientId` and `matterId` for linking to specific clients and cases. New matters automatically get a linked board.
- **Vibe Code (AI App Builder):** An AI-powered board builder at `/vibe-code` where users can use natural language prompts to generate boards, or select from 18 pre-built legal-focused templates.
- **AI Integration (VeriBot):** A multi-model AI assistant (Anthropic Claude, OpenAI GPT, Google Gemini) for legal document analysis, content generation, and summarization, with matter-specific context.
- **Clawbot Gateway Integration:** Connects to OpenClaw/Clawbot for autonomous computer control via natural language.
- **Document & Form Maker:** AI-powered Utah legal document generation system with 5+ templates, URCP compliance checking, and a lawyer approval workflow.
- **Daily Briefing:** A personalized dashboard with task summaries, deadlines, and matter updates.
- **Filing Cabinet:** A two-layer document classification system with controlled vocabulary and Bates numbering.
- **Evidence Vault:** Immutable file storage with SHA-256 chain-of-custody tracking.
- **Detective Board:** A visual investigation board with draggable nodes and connections.
- **Automations:** Event-driven automation engine with 85+ pre-built templates, AI-powered actions, and a Workflow Recorder to suggest automations.
- **SynSeekr Integration:** Hybrid AI architecture connecting to a self-hosted SynSeekr server for advanced AI capabilities (document analysis, entity extraction, RAG queries, investigations, contradiction detection, timeline extraction, AI agents). Includes 12 SynSeekr automation templates.
- **Communications Hub:** Clio-style communications center at `/communications` for client portals, SMS messaging, internal team communication, and activity logs.
- **Legal AI Workspace (VeriBot):** Clio Work/Vincent-style AI-powered legal workspace at `/legal-ai` with conversational AI, a template library, and generated document drafting. Features 14 legal workflow cards.
- **Client Intake Forms:** Clio Grow-style intake form system at `/intake-forms` with 6 pre-built templates.
- **Matter Insights:** OCR-first evidence intelligence system in matter detail views. Supports file upload, text extraction, SHA-256 hashing, and AI-powered analysis (themes, timeline, entities, contradictions, action items, risks) with document citations.
- **Matter Management:** Comprehensive lifecycle management for matters and clients.
- **Billing System:** Complete firm billing infrastructure with expenses, invoices, payments, and trust transactions, accessible via master, client, and matter-specific dashboards.
- **Billing Verifier:** Client-side time entry verification and invoice preparation system at `/billing-verifier`. Features CSV/JSON import, settings for firm info/rates/rules, results summary, daily aggregations, adjustments, review, and various export options. Includes UTBMS code detection and quality checking.
- **Template Library:** Email intelligence template system at `/templates` with 5 types and 20 pre-built legal email templates across 12 categories.
- **Process Recorder:** Workflow capture system that records app events and converts them to automations, macros, or SOPs.
- **Help System & Tooltips:** Centralized feature metadata library providing tooltips, descriptions, and searchable feature guides with "Ask VeriBot" integration.
- **AI Operations Monitor:** In-memory AI usage tracking system for cost, latency, and performance monitoring of AI operations, with an admin-only dashboard.

**System Design Choices:**
- **Authentication:** Multi-user authentication via Replit Auth (Google, GitHub, Apple, email).
- **Role-Based Access Control (RBAC):** Three-tier role system (admin, member, viewer) for route-level permissions.
- **Data Storage:** PostgreSQL with Drizzle ORM for relational data; in-memory store for temporary data.
- **API Design:** RESTful JSON API with a modular Express route architecture.
- **Cloudflare Security Hardening:** Comprehensive security layer including scanner tripwire traps, Cloudflare Turnstile verification, dedicated form rate limiters, trust proxy, custom domain CORS support, and CSP directives.

## Recent Changes
- **Matters UX Overhaul (Feb 2026):** Sidebar reordered to follow intuitive workflow (Clients -> Matters -> Documents -> Time -> Billing). Added responsible party dropdown (from team members) in matter creation. Auto-board creation now includes workspaceId. Added duplicate matter feature. Timestamps (Created/Updated) added as toggleable columns. Board cache invalidated on matter creation so sidebar updates immediately.
- **Board Security Hardening (Feb 2026):** All board routes (GET/POST/PATCH/DELETE) enforce workspace ownership via board->workspace->ownerId chain. Default board listing restricted to user's workspaces only. Defense-in-depth auth checks in every handler.
- **Workspace Architecture (Feb 2026):** Added `workspaces` table with CRUD API routes. Sidebar workspace selector now uses real DB data with create-new-workspace inline. Boards table has `workspaceId` foreign key with index. Sidebar fetches its own boards internally (removed prop dependency from App.tsx).
- **Investigation Board Redesign (Feb 2026):** 3-column layout with cork board canvas, 4 colored zones, 5 element types, SVG connections, minimap, AI status panel.

## KISS Audit Findings (Feb 2026)
**Key Issues Identified:**
1. **Dead MemStorage class (~1500 lines):** `server/storage.ts` contains a full `MemStorage` implementation that is never used - only `DbStorage` from `server/dbStorage.ts` is instantiated. The `IStorage` interface (366 methods) adds unnecessary abstraction for a single implementation.
2. **Storage file sizes:** storage.ts (2642 lines) + dbStorage.ts (4758 lines) = 7400 lines of storage code. Consolidating to just DbStorage without the interface would remove ~2600 lines.
3. **Inconsistent data access patterns:** Some routes (billing-verifier, workspaces) access DB directly via Drizzle; others go through the storage interface. The direct DB pattern is simpler and recommended.
4. **Large page components:** automations.tsx (2923 lines), billing-verifier.tsx (2066 lines) could benefit from component extraction.
5. **Schema size:** shared/schema.ts at 2473 lines is large but functional - mostly type definitions and Zod schemas.

**Recommended Next Steps:**
- Remove MemStorage class and IStorage interface, use DbStorage class directly
- Migrate remaining storage-interface routes to direct DB access pattern
- Extract sub-components from largest page files

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