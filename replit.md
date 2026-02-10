# VERICASE - Legal Practice OS

## Overview
VERICASE is a comprehensive legal practice management system designed to streamline legal workflows for professionals. It offers a Monday.com-style board interface, AI-powered document analysis, secure evidence management, investigative tools, multi-user authentication, and extensive legal practice management features. The system's core purpose is to provide a robust, AI-enhanced platform that improves efficiency and case management, turning complex legal materials into structured, defensible insights without factual hallucination. It aims to reveal patterns, contradictions, and narrative leverage while preserving chain-of-custody and legal relevance.

## User Preferences
- Dark/light theme toggle in header
- Professional legal-focused design
- Clean, modern interface

## System Architecture
VERICASE is built with a modern web stack, featuring React 18 with TypeScript for the frontend, and Node.js with Express for the backend. PostgreSQL with Drizzle ORM handles data persistence.

**UI/UX Decisions:**
The system adopts a Monday.com-style board architecture, offering highly customizable boards with over 15 column types and dynamic column management. It includes an "Approval Column" for legal verification workflows, a collapsible sidebar, and theme support (dark/light mode with teal accents). The interface is responsive and utilizes Shadcn/ui and Radix UI components, styled with Tailwind CSS, for a consistent and modern aesthetic.

**Technical Implementations:**
- **Board System:** Customizable boards with task groups, various column types, and automations for status-based group movement. Supports optional `clientId` and `matterId`.
- **Vibe Code (AI App Builder):** An AI-powered board builder allowing natural language prompts or selection from 18 pre-built legal templates.
- **AI Integration (VeriBot):** A multi-model AI assistant for legal document analysis, content generation, and summarization with matter-specific context.
- **Clawbot Gateway Integration:** Connects to OpenClaw/Clawbot for autonomous computer control.
- **Document & Form Maker:** AI-powered document generation system with URCP compliance checking and lawyer approval workflows.
- **Filing Cabinet:** A two-layer document classification system with Bates numbering.
- **Evidence Vault:** Immutable file storage with SHA-256 chain-of-custody tracking.
- **Detective Board:** A visual investigation board for entity and event graphing, incorporating confidence scores, reliability ratings, and observed/inferred labeling for 14 node types (evidence, person, organization, location, event, theory, note, hypothesis, legal_element, timeline_marker, quote, question, gap_indicator, document_ref) and 8 connection types. Features include right-click context menu, board search overlay with highlighting, connection labels on SVG, JSON export, "What's New" AI findings panel, version history timeline, minimap, cross-board data sync, and unaccounted time analysis.
- **Automations:** Event-driven automation engine with 85+ pre-built templates, AI-powered actions, and a Workflow Recorder.
- **SynSeekr Integration:** Hybrid AI architecture connecting to a self-hosted SynSeekr server for advanced AI capabilities like document analysis, entity extraction, RAG queries, and investigations. Includes 12 SynSeekr automation templates.
- **Communications Hub:** A centralized communication system for client portals, SMS, and internal team interaction.
- **Legal AI Workspace (VeriBot):** An AI-powered legal workspace with conversational AI, template libraries, and document drafting, featuring 14 legal workflow cards.
- **Client Intake Forms:** A system for client intake with 6 pre-built templates.
- **Matter Insights:** An OCR-first evidence intelligence system providing AI-powered analysis (themes, timeline, entities, contradictions) with document citations and OCR session tracking.
- **Matter Management:** Comprehensive lifecycle management for matters and clients.
- **Billing System:** Complete firm billing infrastructure with expenses, invoices, payments, and trust transactions.
- **Billing Verifier:** Client-side time entry verification and invoice preparation system with CSV/JSON import, UTBMS code detection, and export options.
- **Template Library:** Email intelligence template system with 5 types and 20 pre-built legal email templates.
- **Process Recorder:** Workflow capture system that converts app events into automations, macros, or SOPs.
- **Model Intelligence Advisor:** An open-source model tracking and recommendation system that monitors models, provides quality scores, task-specific recommendations, and alerts.
- **Help System & Tooltips:** Centralized feature metadata library providing tooltips, descriptions, and searchable guides with "Ask VeriBot" integration.
- **AI Operations Monitor:** In-memory AI usage tracking system for cost, latency, and performance, with an admin-only dashboard.
- **PDF Pro:** Advanced legal document processing module for matter-scoped PDFs, featuring SHA-256 integrity hashing, async job queue (OCR, Bates numbering, PII wash/detection), document version tracking, and Bates set management.
- **Legal Research:** Deep AI-powered legal research feature with a multi-step pipeline for query planning, sequential execution, and final compilation into structured legal memos.
- **Analysis Modules API (Plug-and-Play Spec):** 5 standardized weapon modules (contradiction_finder, timeline_builder, entity_graph_builder, damages_ledger, discovery_sniper) with policy-engine-gated execution, standardized evidence citations (documentId, pageNumber, textSpan, confidence, sourceType), auditId tracking, and AI ops monitoring. Accessible via `/api/analysis/queue` and `/api/analysis/modules`.
- **Case Insights API:** Comprehensive case-level intelligence at `/api/cases/:caseId/insights` with element coverage analysis, key findings, and recommendations. Sub-endpoints for `/graph`, `/timeline`, `/contradictions`, and `/query` (RAG).
- **Court-Ready Export:** Standalone JSON export at `/api/documents/:id/export-for-court` with SHA-256 recomputation verification, custody chain, and attestation. Document verification at `/api/documents/:id/verify` and `/api/documents/:id/custody-chain`.
- **RAG Query System:** In-memory keyword-based retrieval across detective nodes, evidence vault, and matter timeline with relevance scoring, citations, and auditId tracking at `/api/cases/:caseId/query`.
- **Unified Calendar Sync:** Calendar events auto-sync from 7 entity types.
- **Cross-Entity Data Linkage System:** Backend linking all entities (clients, matters, contacts, billing, time entries, boards, evidence).
- **Workspace Architecture:** Supports multiple workspaces with independent boards and data.
- **E-Filing Automation Brain:** A comprehensive legal document automation system with an AI-powered document classifier, rules-based deadline engine, and sequencing engine.
- **Legal Video Pipeline:** Converts iPhone screen recordings of legal documents into structured, searchable text using local SynSeekr AI models exclusively. Features a 7-stage async pipeline (validate, extract frames via ffmpeg, deduplicate via perceptual hashing, OCR via SynSeekr vision model, stitch overlapping text via LLM, entity extraction via regex + LLM, output generation). Includes SSE-based real-time progress streaming, drag-drop upload UI, tabbed results view (document text, entities, stage details), board linking for integration with the board system, and user-scoped access control.
- **Email Intelligence Module:** Drop-in email analysis engine with 14+ API endpoints. Analyzes emails for urgency (4 levels), sentiment (7 categories), deception detection (6 tactic types with 0-10 scoring), deadline extraction, case number detection, money amount extraction, lawyer communication identification, and psychological profiling (power dynamics, emotional state, manipulation risk). Features auto-linking to matters by case number, contact intelligence with behavior timelines, multi-matter client detection, and admin alert system for Lauren with 6 trigger types (angry_client, upset_client, billing_dispute, deadline_risk, opposing_threat, manipulation_detected). Supports .eml file upload and JSON body input. Includes Utah filing deadline reference. DB tables: analyzed_emails, admin_alerts, email_contacts.

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