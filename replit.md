# VERICASE - Legal Practice OS

## Overview
VERICASE is a comprehensive legal practice management system designed to streamline legal workflows for professionals. It offers a Monday.com-style board interface, AI-powered document analysis, secure evidence management, investigative tools, multi-user authentication, and extensive legal practice management features. The system's core purpose is to provide a robust, AI-enhanced platform that improves efficiency and case management, turning complex legal materials into structured, defensible insights without factual hallucination. It aims to reveal patterns, contradictions, and narrative leverage while preserving chain-of-custody and legal relevance.

## User Preferences
- Dark/light theme toggle in header
- Professional legal-focused design
- Clean, modern interface
- Engineering principles: YAGNI, DRY (Rule of Three), SRP, encapsulate volatility, reduce concepts, kill dead code

## System Architecture
VERICASE is built with a modern web stack, featuring React 18 with TypeScript for the frontend, and Node.js with Express for the backend. PostgreSQL with Drizzle ORM handles data persistence.

**UI/UX Decisions:**
The system adopts a Monday.com-style board architecture, offering highly customizable boards with over 15 column types and dynamic column management. It includes an "Approval Column" for legal verification workflows, a collapsible sidebar with hierarchical Client→Matter→Boards tree navigation, and theme support (dark/light mode with teal accents). The interface is responsive and utilizes Shadcn/ui and Radix UI components, styled with Tailwind CSS, for a consistent and modern aesthetic. The board view features a single horizontal scroller with frozen left columns, a global sticky header, scroll navigation tools, per-group workflow status filters, and three density modes. The sidebar includes board search, pin-to-top, and recent boards tracking.

**Technical Implementations:**
- **Board System:** Customizable boards with task groups, various column types, automations, and optional `clientId` and `matterId` integration.
- **Vibe Code (AI App Builder):** An AI-powered board builder allowing natural language prompts or selection from pre-built legal templates.
- **AI Integration (VeriBot):** A multi-model AI assistant for legal document analysis, content generation, and summarization with matter-specific context.
- **Clawbot Gateway Integration:** Connects to OpenClaw/Clawbot for autonomous computer control.
- **Document & Form Maker:** AI-powered document generation system with URCP compliance checking and lawyer approval workflows.
- **Filing Cabinet:** A two-layer document classification system with Bates numbering.
- **Evidence Vault:** Immutable file storage with SHA-256 chain-of-custody tracking.
- **Detective Board:** A visual investigation board for entity and event graphing, incorporating confidence scores, reliability ratings, and observed/inferred labeling for 14 node types and 8 connection types. Features include right-click context menu, board search, connection labels, JSON export, AI findings panel, version history, minimap, cross-board data sync, and unaccounted time analysis.
- **Automations:** Event-driven automation engine with pre-built templates, AI-powered actions, and a Workflow Recorder.
- **SynSeekr Integration:** Hybrid AI architecture connecting to a self-hosted SynSeekr server for advanced AI capabilities like document analysis, entity extraction, RAG queries, and investigations, including 12 automation templates.
- **SynSeeker Investigation Engine:** Automated entity investigation module with 8 data sources (web scraping, WHOIS, OpenCorporates, CourtListener, NPI registry, online reviews, social profiles, news coverage). Features AI analysis, heuristic scoring, entity connection mapping, and real-time SSE progress streaming. Includes 4 pre-built investigation templates.
- **Communications Hub:** A centralized communication system for client portals, SMS, and internal team interaction.
- **Legal AI Workspace (VeriBot):** An AI-powered legal workspace with conversational AI, template libraries, and document drafting, featuring 14 legal workflow cards.
- **Client Intake Forms:** A system for client intake with 6 pre-built templates.
- **Matter Insights:** An OCR-first evidence intelligence system providing AI-powered analysis (themes, timeline, entities, contradictions) with document citations and OCR session tracking.
- **Matter Management:** Comprehensive lifecycle management for matters and clients.
- **Billing System:** Complete firm billing infrastructure with expenses, invoices, payments, and trust transactions.
- **Billing Verifier:** Client-side time entry verification and invoice preparation system with CSV/JSON import, UTBMS code detection, and export options.
- **Template Library:** Email intelligence template system with 5 types and 20 pre-built legal email templates.
- **Process Recorder:** Workflow capture system that converts app events into automations, macros, or SOPs.
- **Model Intelligence Advisor:** An open-source model tracking and recommendation system that monitors models, provides quality scores, task-specific recommendations, and alerts. Accessible from the AI Resources dashboard.
- **AI Resources Dashboard:** Dual-mode control center for switching between "SynSeekr Private" (local models, no external API calls) and "Full Integrated" (cloud models: Claude, GPT, Gemini). Features GPU/CPU/VRAM/disk monitoring when in private mode, AI operations cost tracking, model selection picker, and links to Model Advisor.
- **Help System & Tooltips:** Centralized feature metadata library providing tooltips, descriptions, and searchable guides with "Ask VeriBot" integration.
- **AI Operations Monitor:** In-memory AI usage tracking system for cost, latency, and performance, with an admin-only dashboard.
- **Reports Hub:** Clio-style reports system with 14 pre-built reports across 5 categories, featuring a card/table catalog view, preview modal, detail view with summary stats bar, sortable data table, column visibility, pagination, text filter, and CSV export.
- **PDF Pro:** Advanced legal document processing module for matter-scoped PDFs, featuring SHA-256 integrity hashing, async job queue (OCR, Bates numbering, PII wash/detection), document version tracking, and Bates set management.
- **Legal Research:** Deep AI-powered legal research feature with a multi-step pipeline for query planning, sequential execution, and final compilation into structured legal memos.
- **Analysis Modules API (Plug-and-Play Spec):** 5 standardized weapon modules (contradiction_finder, timeline_builder, entity_graph_builder, damages_ledger, discovery_sniper) with policy-engine-gated execution, standardized evidence citations, auditId tracking, and AI ops monitoring.
- **Case Insights API:** Comprehensive case-level intelligence with element coverage analysis, key findings, and recommendations.
- **Court-Ready Export:** Standalone JSON export with SHA-256 recomputation verification, custody chain, and attestation.
- **RAG Query System:** In-memory keyword-based retrieval across detective nodes, evidence vault, and matter timeline with relevance scoring, citations, and auditId tracking.
- **Unified Calendar Sync:** Calendar events auto-sync from 7 entity types.
- **Cross-Entity Data Linkage System:** Backend linking all entities (clients, matters, contacts, billing, time entries, boards, evidence).
- **Workspace Architecture:** Supports multiple workspaces with independent boards and data.
- **E-Filing Automation Brain:** A comprehensive legal document automation system with an AI-powered document classifier, rules-based deadline engine, and sequencing engine.
- **Legal Video Pipeline:** Converts iPhone screen recordings of legal documents into structured, searchable text using local SynSeekr AI models. Features a 7-stage async pipeline (validate, extract frames, deduplicate, OCR, stitch text, entity extraction, output generation) with SSE-based real-time progress streaming, drag-drop upload UI, and board linking.
- **Kill Switch (Security Lockdown):** Emergency app-wide lockdown system accessible from the header. Admin-only activation generates a 6-character recovery key, stops processing, locks matter permissions, enables audit logging, and deploys honeypot documents. Deactivation requires the recovery key.
- **Email Intelligence Module:** Drop-in email analysis engine with 14+ API endpoints. Analyzes emails for urgency, sentiment, deception detection, deadline extraction, case number detection, money amount extraction, lawyer communication identification, and psychological profiling. Features auto-linking to matters, contact intelligence, multi-matter client detection, and admin alert system for Lauren with 6 trigger types.

**System Design Choices:**
- **Authentication:** Multi-user authentication via Replit Auth (Google, GitHub, Apple, email).
- **Role-Based Access Control (RBAC):** Three-tier role system (admin, member, viewer) for route-level permissions.
- **Data Storage:** PostgreSQL with Drizzle ORM for relational data; in-memory store for temporary data.
- **API Design:** RESTful JSON API with a modular Express route architecture.
- **Cloudflare Security Hardening:** Comprehensive security layer including scanner tripwire traps, Turnstile verification, form rate limiters, trust proxy, custom domain CORS, and CSP directives.
- **Runtime Doctrine:** Central decision layer for model choice and data isolation, enforcing ONLINE/BATMODE. Batmode blocks external API calls and falls back to local SynSeekr models.

## External Dependencies
- **Replit Auth:** For multi-user authentication.
- **PostgreSQL:** Primary database.
- **Drizzle ORM:** ORM for PostgreSQL.
- **Anthropic Claude, OpenAI GPT, Google Gemini:** External AI models.
- **Wouter:** Frontend routing.
- **TanStack React Query:** Frontend server state management.
- **shadcn/ui + Radix UI:** UI component libraries.
- **Tailwind CSS:** Frontend styling.
- **React Hook Form with Zod:** Form management and validation.
- **connect-pg-simple:** PostgreSQL-based session storage.
- **pdf-lib:** For PDF manipulation.
- **multer:** For file uploads.