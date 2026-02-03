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
The system adopts a Monday.com-style board architecture, offering highly customizable boards with over 15 column types, dynamic column management, and group summary rows for aggregated statistics. An "Approval Column" supports legal verification workflows with audit trails. The interface includes a collapsible sidebar for navigation, theme support (dark/light mode with teal accents), and is designed to be responsive across devices. Shadcn/ui and Radix UI components, styled with Tailwind CSS, ensure a consistent and modern aesthetic.

**Technical Implementations:**
- **Board System:** Customizable boards with task groups and various column types (status, priority, date, person, progress, files, email, approval, etc.). Columns can be added, removed, reordered, and their types changed dynamically.
- **AI Integration (ClaudBot):** A multi-model AI assistant (Anthropic Claude, OpenAI GPT, Google Gemini) for legal document analysis, content generation, information extraction, and summarization, with matter-specific context injection.
- **Daily Briefing:** A personalized dashboard providing users with task summaries, deadlines, and active matter updates.
- **Filing Cabinet:** A two-layer document classification system with controlled vocabulary, metadata tracking, and Bates numbering.
- **Evidence Vault:** Immutable file storage with SHA-256 chain-of-custody tracking.
- **Detective Board:** A visual investigation board with draggable nodes and connections.
- **Automations:** Event-driven automation engine with 85+ pre-built templates, including AI-powered actions, legal compliance workflows, and integrations. An AI Automation Builder allows natural language automation creation, and a Workflow Recorder suggests automations based on user actions.
- **Matter Management:** Comprehensive lifecycle management for matters and clients, including contacts, threads, and timelines.

**System Design Choices:**
- **Authentication:** Multi-user authentication is handled via Replit Auth, supporting various providers (Google, GitHub, Apple, email).
- **Role-Based Access Control (RBAC):** A three-tier role system (admin, member, viewer) is implemented, granting route-level permissions. The first registered user becomes an admin, with subsequent users defaulting to "member."
- **Data Storage:** PostgreSQL with Drizzle ORM for relational data, and an in-memory store (MemStorage) for non-authentication related temporary data. Sessions are managed using connect-pg-simple in PostgreSQL.
- **API Design:** A RESTful JSON API with a modular route architecture using Express.

## External Dependencies
- **Replit Auth:** For multi-user authentication (Google, GitHub, Apple, email login).
- **PostgreSQL:** Primary database for persistent data storage.
- **Drizzle ORM:** Object-relational mapper for interacting with PostgreSQL.
- **Anthropic Claude, OpenAI GPT, Google Gemini:** AI models integrated into the "ClaudBot" assistant.
- **Wouter:** For frontend routing in React.
- **TanStack React Query:** For server state management in the frontend.
- **shadcn/ui + Radix UI:** UI component libraries for the frontend.
- **Tailwind CSS:** For styling the frontend.
- **React Hook Form with Zod:** For form management and validation.
- **connect-pg-simple:** For PostgreSQL-based session storage.