# VERICASE - Legal Practice OS

## Overview
VERICASE is a comprehensive legal practice management system with a Monday.com-style board architecture. Built with React, TypeScript, Express, and in-memory storage.

## Features
- **Board System**: Multiple customizable boards for different practice areas
- **Task Groups**: Organize tasks within collapsible groups
- **Multiple Column Types**: Status, priority, date, person, progress columns
- **Task Management**: Create, update, delete tasks with full CRUD operations
- **Theme Support**: Dark and light mode with smooth transitions
- **Responsive Design**: Works on desktop and mobile devices

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
- In-memory storage (MemStorage)
- RESTful JSON API

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
├── server/                 # Backend Express server
│   ├── routes.ts          # API route definitions
│   └── storage.ts         # Data storage layer
├── shared/                 # Shared types and schemas
│   └── schema.ts          # TypeScript interfaces and Zod schemas
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

## Running the Project
```bash
npm run dev
```
Opens on http://localhost:5000

## User Preferences
- Dark/light theme toggle in header
- Professional legal-focused design
- Clean, modern interface
