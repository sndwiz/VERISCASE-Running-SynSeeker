# VERICASE - Legal Practice OS

## Overview
VERICASE is a comprehensive legal practice management system with a Monday.com-style board architecture. Built with React, TypeScript, Express, PostgreSQL, and Drizzle ORM. Features AI-powered document analysis, evidence management, detective board for investigations, multi-user authentication via Replit Auth, and full legal practice management.

## Features
- **Board System**: Multiple customizable boards for different practice areas
- **Task Groups**: Organize tasks within collapsible groups
- **Multiple Column Types**: Status, priority, date, person, progress columns
- **Task Management**: Create, update, delete tasks with full CRUD operations
- **AI Assistant**: Multi-model AI chat with Anthropic integration (OpenAI/DeepSeek planned)
- **Evidence Vault**: Immutable file storage with SHA-256 chain-of-custody tracking
- **Detective Board**: Visual investigation board with draggable nodes and connections
- **Automations**: Event-driven automation rules with triggers and actions
- **Matter Management**: Full matter/client lifecycle with contacts, threads, timeline
- **Theme Support**: Dark and light mode with smooth transitions
- **Responsive Design**: Works on desktop and mobile devices
- **Authentication**: Multi-user support via Replit Auth (Google, GitHub, Apple, email login)

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

## Important Schema Notes
- Matter creation requires `openedDate` field (not openDate)
- MatterContact role is enum: plaintiff, defendant, witness, expert, opposing-counsel, judge, client, other
- Evidence files are immutable - only metadata can be updated
- Chain of custody entries are append-only

## Running the Project
```bash
npm run dev
```
Opens on http://localhost:5000

## User Preferences
- Dark/light theme toggle in header
- Professional legal-focused design
- Clean, modern interface
