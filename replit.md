# VERICASE - Legal Practice OS

## Overview
VERICASE is a comprehensive legal practice management system with a Monday.com-style board architecture. Built with React, TypeScript, Express, PostgreSQL, and Drizzle ORM. Features AI-powered document analysis, evidence management, detective board for investigations, multi-user authentication via Replit Auth, and full legal practice management.

## Features
- **Board System**: Multiple customizable boards for different practice areas
- **Task Groups**: Organize tasks within collapsible groups
- **Multiple Column Types**: Status, priority, date, person, progress, time tracking, files columns (8 types)
- **Dynamic Column Management**: Add, remove, toggle visibility, and reorder columns
- **Group By**: Organize tasks by Default/Status/Priority/Owner
- **Task Management**: Create, update, delete tasks with full CRUD operations
- **AI Assistant**: Multi-model AI chat with Anthropic Claude, OpenAI GPT, and Google Gemini models. Features legal-focused system prompts, matter context injection for case-aware responses, and conversation linking to specific matters
- **Filing Cabinet**: Two-layer document classification with controlled vocabulary (8 categories, 50+ document types), metadata tracking (parties, dates, privilege, Bates ranges), searchable document library, and batch upload support
- **Evidence Vault**: Immutable file storage with SHA-256 chain-of-custody tracking
- **Detective Board**: Visual investigation board with draggable nodes and connections
- **Automations**: Event-driven automation rules with triggers and actions, plus template library with pre-built recipes organized by category
- **Matter Management**: Full matter/client lifecycle with contacts, threads, timeline
- **Theme Support**: Dark and light mode with teal accents, smooth transitions
- **Collapsible Sidebar**: Hierarchical navigation with workspace selector, collapsible sections
- **Responsive Design**: Works on desktop and mobile devices
- **Authentication**: Multi-user support via Replit Auth (Google, GitHub, Apple, email login)
- **Role-Based Access Control**: Admin, member, viewer roles with route-level permissions
- **Team Management**: Admin can manage user roles via Settings > Team tab

## Tech Stack

### Frontend
- React 18 with TypeScript
- Wouter for routing
- TanStack React Query for state management
- shadcn/ui + Radix UI components
- Tailwind CSS for styling
- React Hook Form with Zod validation

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL database with Drizzle ORM
- In-memory storage (MemStorage) for non-auth data
- Replit Auth for authentication
- RESTful JSON API
- Modular route architecture

## Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── board/      # Board-related components
│   │   │   ├── dialogs/    # Dialog modals
│   │   │   └── ui/         # shadcn/ui components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and helpers
│   │   └── pages/          # Route pages
│   │       ├── ai-chat.tsx          # AI Assistant page
│   │       ├── evidence-vault.tsx   # Evidence management
│   │       ├── detective-board.tsx  # Investigation board
│   │       ├── automations.tsx      # Automation rules
│   │       ├── matters.tsx          # Matter management
│   │       └── clients.tsx          # Client management
├── server/                 # Backend Express server
│   ├── routes/            # Modular route files
│   │   ├── index.ts       # Route aggregator
│   │   ├── boards.ts      # Board CRUD
│   │   ├── groups.ts      # Group CRUD
│   │   ├── tasks.ts       # Task CRUD
│   │   ├── clients.ts     # Client CRUD
│   │   ├── matters.ts     # Matters, contacts, threads, timeline, research
│   │   ├── evidence.ts    # Evidence vault, OCR jobs
│   │   ├── detective.ts   # Detective board nodes/connections
│   │   ├── automations.ts # Automation rules
│   │   └── ai.ts          # AI conversations and chat
│   ├── ai/
│   │   └── providers.ts   # AI provider configuration
│   ├── routes.ts          # Main route entry point
│   ├── storage.ts         # Data storage layer
│   ├── db.ts              # Database connection (Drizzle/PostgreSQL)
│   └── replit_integrations/
│       └── auth/          # Replit Auth integration
│           ├── replitAuth.ts  # OIDC auth setup
│           ├── storage.ts     # User storage operations
│           └── routes.ts      # Auth API routes
├── shared/                 # Shared types and schemas
│   ├── schema.ts          # TypeScript interfaces and Zod schemas
│   └── models/
│       └── auth.ts        # User and session Drizzle tables
└── replit.md              # Project documentation
```

## API Routes

### Boards
- `GET /api/boards` - List all boards
- `GET /api/boards/:id` - Get single board
- `POST /api/boards` - Create new board
- `PATCH /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board

### Groups
- `GET /api/boards/:boardId/groups` - List groups for a board
- `POST /api/boards/:boardId/groups` - Create new group
- `PATCH /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Tasks
- `GET /api/boards/:boardId/tasks` - List tasks for a board
- `GET /api/tasks/recent` - Get recent tasks
- `POST /api/boards/:boardId/tasks` - Create new task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Clients
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get single client
- `POST /api/clients` - Create client
- `PATCH /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Matters
- `GET /api/matters` - List all matters (optional ?clientId filter)
- `GET /api/matters/:id` - Get single matter
- `POST /api/matters` - Create matter (requires openedDate field)
- `PATCH /api/matters/:id` - Update matter
- `DELETE /api/matters/:id` - Delete matter
- `GET /api/matters/:matterId/contacts` - List matter contacts
- `POST /api/matters/:matterId/contacts` - Add contact (role is enum)
- `GET /api/matters/:matterId/threads` - List threads
- `POST /api/matters/:matterId/threads` - Create thread
- `GET /api/matters/:matterId/timeline` - List timeline events
- `POST /api/matters/:matterId/timeline` - Add timeline event

### Filing Cabinet
- `GET /api/matters/:matterId/files` - List files for a matter
- `POST /api/matters/:matterId/files` - Upload file to matter
- `PATCH /api/files/:id` - Update file metadata
- `DELETE /api/files/:id` - Delete file
- `GET /api/files/:fileId/profile` - Get document profile
- `POST /api/files/:fileId/profile` - Create document profile
- `PATCH /api/files/:fileId/profile` - Update document profile (validates docType against category)
- `DELETE /api/files/:fileId/profile` - Delete document profile
- `GET /api/filing/tags` - List filing tags
- `POST /api/filing/tags` - Create filing tag
- `DELETE /api/filing/tags/:id` - Delete filing tag
- `GET /api/matters/:matterId/people-orgs` - List people/orgs for matter
- `POST /api/matters/:matterId/people-orgs` - Create person/org
- `PATCH /api/people-orgs/:id` - Update person/org
- `DELETE /api/people-orgs/:id` - Delete person/org

### Evidence Vault
- `GET /api/matters/:matterId/evidence` - List evidence files
- `POST /api/matters/:matterId/evidence` - Add evidence (immutable)
- `POST /api/evidence/:id/custody` - Add chain of custody entry

### Detective Board
- `GET /api/matters/:matterId/detective/nodes` - List nodes
- `POST /api/matters/:matterId/detective/nodes` - Create node
- `PATCH /api/detective/nodes/:id` - Update node position
- `DELETE /api/detective/nodes/:id` - Delete node
- `GET /api/matters/:matterId/detective/connections` - List connections
- `POST /api/matters/:matterId/detective/connections` - Create connection

### Automations
- `GET /api/boards/:boardId/automations` - List automation rules
- `POST /api/boards/:boardId/automations` - Create rule
- `PATCH /api/automations/:id` - Update rule (toggle active)
- `DELETE /api/automations/:id` - Delete rule

### AI
- `GET /api/ai/conversations` - List conversations
- `POST /api/ai/conversations` - Create conversation
- `GET /api/ai/conversations/:id` - Get conversation with messages
- `POST /api/ai/conversations/:id/messages` - Add message
- `POST /api/ai/chat` - Send message to AI (streaming)
- `GET /api/ai/models` - List available AI models

### Authentication
- `GET /api/login` - Initiate Replit Auth login flow
- `GET /api/callback` - OAuth callback handler
- `GET /api/logout` - Logout and clear session
- `GET /api/auth/user` - Get current authenticated user (protected)

### Admin (Requires admin role)
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/role` - Update user role (admin/member/viewer)

## Authentication & Authorization

### Role-Based Access Control (RBAC)
The system uses a three-tier role system:
- **admin**: Full access to all routes + user management
- **member**: Full CRUD access to boards, matters, evidence, etc.
- **viewer**: Read-only access (GET requests only) to boards, groups, tasks, clients, matters, detective board

### Route Protection
- All business routes require authentication
- Route-level RBAC middleware enforces role permissions:
  - `viewerReadOnly`: Allows GET for viewers, member+ for writes (boards, groups, tasks, clients, matters, detective)
  - `requireMemberOrAbove`: Requires member or admin role (evidence vault, automations)
  - `requireAnyRole`: Any authenticated user (AI features)
  - `requireAdmin`: Admin only (user management)

### First User Bootstrap
The first user to register automatically becomes an admin. Subsequent users default to "member" role.

### Session Management
- Sessions stored in PostgreSQL using connect-pg-simple
- Cookie security adapts to environment (secure in production, lax in development)
- Logout properly destroys session

### Team Members
- All authenticated users are automatically team members
- Team members are available for task assignment in the person picker
- Admins can manage user roles via Settings > Team tab
- Role determines access level (admin full access, member CRUD, viewer read-only)

## Important Schema Notes
- Matter creation requires `openedDate` field (not openDate)
- MatterContact role is enum: plaintiff, defendant, witness, expert, opposing-counsel, judge, client, other
- Evidence files are immutable - only metadata can be updated
- Chain of custody entries are append-only
- Filing Cabinet uses two-layer classification: docCategory (8 types) + docType (validated against docTypesByCategory controlled vocabulary)
- DocProfile docType must match valid types for its docCategory (enforced via Zod superRefine validation)
- Document categories: pleading, motion, discovery, order-ruling, correspondence, evidence-records, internal-work-product, admin-operations
- Confidentiality levels: public, confidential, aeo (attorneys' eyes only), privileged, work-product

## Running the Project
```bash
npm run dev
```
Opens on http://localhost:5000

## User Preferences
- Dark/light theme toggle in header
- Professional legal-focused design
- Clean, modern interface
