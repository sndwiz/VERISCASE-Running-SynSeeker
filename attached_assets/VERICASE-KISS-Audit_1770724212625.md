# VERICASE Code Audit: KISS Violations, Bloat & Redundancies

**Date:** February 10, 2026  
**Repo:** sndwiz/VERISCASE-Running-SynSeeker  
**Verdict:** The app works, but it's carrying serious weight. Here's what's slowing you down.

---

## The Numbers (They Don't Lie)

| Metric | Count | Problem Threshold |
|--------|-------|-------------------|
| Page files | **47** | Most SaaS apps ship with 15-20 |
| Database tables | **85** | That's ERP-level for a practice mgmt tool |
| Server files | **101** | |
| dbStorage.ts methods | **154** | God Object — should be ~10 files |
| Schema exports | **109** | |
| Zod validation objects | **101** | |
| Total client page code | **1.36 MB** | Average 29KB per page |
| Total server code | **1.13 MB** | |
| Unused UI components | **10** | Dead code |

---

## 🔴 Critical Issues (Fix These First)

### 1. God Object: `dbStorage.ts` — 4,560 lines, 179KB

This is the single biggest KISS violation. ONE class with **154 async methods** handling CRUD for every entity in the system. Every time you touch any feature, you're editing this file. It's a merge conflict magnet and makes the codebase feel way more complex than it needs to be.

**Every method follows the exact same pattern:**
```typescript
async getThings(): Promise<Thing[]> {
  return await db.select().from(things).orderBy(desc(things.createdAt));
}
async createThing(data: InsertThing): Promise<Thing> {
  const [thing] = await db.insert(things).values({ id: uuid(), ...data }).returning();
  return thing;
}
async updateThing(id: string, data: Partial<Thing>): Promise<Thing | undefined> {
  const [thing] = await db.update(things).set(data).where(eq(things.id, id)).returning();
  return thing;
}
async deleteThing(id: string): Promise<boolean> {
  const result = await db.delete(things).where(eq(things.id, id)).returning();
  return result.length > 0;
}
```

**Fix:** Create a generic CRUD base:
```typescript
// db/crud.ts
function createCrudService<T>(table, idField = 'id') {
  return {
    getAll: () => db.select().from(table),
    getById: (id) => db.select().from(table).where(eq(table[idField], id)),
    create: (data) => db.insert(table).values({ id: uuid(), ...data }).returning(),
    update: (id, data) => db.update(table).set(data).where(eq(table[idField], id)).returning(),
    delete: (id) => db.delete(table).where(eq(table[idField], id)).returning(),
  };
}

// Usage
export const clientService = createCrudService(clients);
export const matterService = createCrudService(matters);
// Then only write custom methods for complex queries
```

This would eliminate ~80% of dbStorage.ts overnight.

---

### 2. Monster Page Components

These files are doing WAY too much in one component:

| File | Size | Lines | Problem |
|------|------|-------|---------|
| detective-board.tsx | 111KB | 2,705 | 19 useState, 5 dialogs inline |
| matter-detail.tsx | 63KB | ~1,500 | 7 dialogs inline |
| billing-tabs.tsx | 56KB | ~1,400 | |
| product-guide.tsx | 53KB | ~1,300 | 100% hardcoded static content |
| settings.tsx | 47KB | ~1,200 | |
| security-dashboard.tsx | 46KB | ~1,100 | Hardcoded mock data |
| clients.tsx | 36KB | ~900 | 11 DialogContent instances! |

**The pattern:** Every page defines its own dialogs, forms, and state inline instead of using shared components. `clients.tsx` has **11 Dialog instances** copy-pasted with slight variations.

**Fix:** Extract shared patterns:
- `<CrudDialog>` — generic create/edit dialog
- `<ConfirmDeleteDialog>` — shared delete confirmation  
- `<DataTable>` — shared table with search, filter, sort
- `<PageLayout>` — shared header + search + create button pattern

---

### 3. Schema Bloat: 172KB of Type Definitions

- `shared/schema.ts` — 90KB, 2,783 lines, 101 Zod objects
- `shared/models/tables.ts` — 81KB, 1,660 lines, 85 pgTables

The schema file has **56 column type definitions** including AI-powered column types (`ai-improve`, `ai-write`, `ai-extract`, `ai-summarize`, `ai-translate`, `ai-sentiment`, `ai-categorize`) that I doubt are all implemented. That's complexity with no payoff.

**Fix:** Split schema.ts into domain modules:
```
shared/schemas/
  boards.ts      (boards, groups, tasks)
  legal.ts       (matters, clients, contacts)
  documents.ts   (files, evidence, OCR)
  billing.ts     (invoices, payments, time)
  ai.ts          (conversations, messages)
  detective.ts   (nodes, connections)
```

---

## 🟡 Medium Issues (Clean Up When You Can)

### 4. 10 Dead UI Components

These shadcn components are installed but **imported by exactly 0 files**:

- `carousel.tsx`
- `aspect-ratio.tsx`
- `menubar.tsx`
- `navigation-menu.tsx`
- `input-otp.tsx`
- `toggle-group.tsx`
- `hover-card.tsx`
- `context-menu.tsx`
- `drawer.tsx`
- `resizable.tsx`

**Fix:** Delete them. They're dead weight in the bundle. If you need them later, `npx shadcn-ui add carousel` takes 5 seconds.

---

### 5. Inconsistent Route Registration

The server uses TWO different patterns for registering routes:

**Pattern A — Function-based:**
```typescript
registerBoardRoutes(app);
registerClientRoutes(app);
registerMatterRoutes(app);
```

**Pattern B — Router-based:**
```typescript
app.use('/api/clawbot', clawbotRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/pdf-pro', pdfProRouter);
```

There are **28 function-style** and **13 router-style** registrations mixed together. Pick one.

**Fix:** Standardize on Express Router (Pattern B). It's cleaner and gives you middleware scoping per route group.

---

### 6. Duplicate CRUD Route Boilerplate

Every route file repeats the exact same try/catch + Zod parse + storage call pattern:

```typescript
app.post("/api/clients", async (req, res) => {
  try {
    const data = insertClientSchema.parse(req.body);
    const client = await storage.createClient(data);
    res.status(201).json(client);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create client" });
  }
});
```

This is copy-pasted across **30+ route files** with only the entity name changing.

**Fix:** Create a route factory:
```typescript
function crudRoutes(path, service, insertSchema, updateSchema) {
  const router = Router();
  router.get('/', asyncHandler(async (req, res) => {
    res.json(await service.getAll());
  }));
  router.post('/', asyncHandler(async (req, res) => {
    const data = insertSchema.parse(req.body);
    res.status(201).json(await service.create(data));
  }));
  // ... update, delete
  return router;
}

// Usage
app.use('/api/clients', crudRoutes('/api/clients', clientService, insertClientSchema, updateClientSchema));
```

---

### 7. Hardcoded Static Content in Page Components

Several large files are essentially **static JSON/content masquerading as React components**:

| File | Size | What It Really Is |
|------|------|-------------------|
| automation-templates.ts | 63KB (1,583 lines) | Hardcoded template definitions |
| product-guide.tsx | 53KB (1,300 lines) | Static documentation |
| feature-metadata.ts | 27KB (610 lines) | Feature registry |
| core-doctrine.ts | 13KB | AI prompt templates |

**Fix:** Move static content to JSON/YAML files or a CMS. `product-guide.tsx` especially should be a markdown file rendered by a component, not 1,300 lines of JSX.

---

### 8. Client-Side Form State Explosion

`clients.tsx` manages **8 separate useState calls** for different form states plus **2 form objects** with manual field tracking:

```typescript
const [showCreateDialog, setShowCreateDialog] = useState(false);
const [showEditDialog, setShowEditDialog] = useState(false);
const [showNextStepDialog, setShowNextStepDialog] = useState(false);
const [showQuickMatterDialog, setShowQuickMatterDialog] = useState(false);
const [showMatterSuccessDialog, setShowMatterSuccessDialog] = useState(false);
const [selectedClient, setSelectedClient] = useState(null);
const [newlyCreatedClient, setNewlyCreatedClient] = useState(null);
const [newlyCreatedMatter, setNewlyCreatedMatter] = useState(null);
const [clientForm, setClientForm] = useState({...});
const [matterForm, setMatterForm] = useState({...});
```

This is a state management nightmare. Each dialog is its own inline component with 50-100 lines of JSX.

**Fix:** Use a single dialog state machine:
```typescript
const [dialog, setDialog] = useState<
  | { type: 'create-client' }
  | { type: 'edit-client'; client: Client }
  | { type: 'create-matter'; client: Client }
  | null
>(null);
```

Or better yet, extract dialogs into their own component files.

---

## 🟢 What's Actually Good

To be fair, this stuff is solid:

- **Wouter for routing** — lightweight, no React Router bloat ✅
- **Lazy loading all pages** — good for bundle splitting ✅  
- **TanStack Query** — proper data fetching with cache ✅
- **Drizzle ORM** — type-safe, no extra abstraction layer ✅
- **Utility functions exist** (pagination, auth, errors) — just need more of them ✅
- **Core Doctrine pattern** — the AI prompt engineering is thoughtful and well-structured ✅
- **Workspace/multi-tenancy** — scoped correctly in the routes ✅

---

## Priority Action Plan

### Phase 1: Quick Wins (1-2 days)
1. Delete 10 unused UI components
2. Wire up all Quick Actions and dashboard elements (done — see the files I already gave you)
3. Pick one route pattern and convert the other

### Phase 2: Structural (3-5 days)  
4. Create generic CRUD service to replace 80% of dbStorage.ts
5. Create route factory to eliminate boilerplate
6. Extract shared dialog components (CrudDialog, ConfirmDelete, DataTable)

### Phase 3: Decomposition (ongoing)
7. Split schema.ts into domain modules
8. Break down monster pages (detective-board, matter-detail, clients) into sub-components
9. Move static content out of TSX files into data files
10. Audit which of the 85 tables are actually used by the UI

---

## One Last Thing

85 database tables and 47 page files for a practice management tool is a LOT. If some features are speculative or unused (video pipeline? vibe code? model advisor?), consider feature-flagging them out of the build entirely. Shipping less is shipping faster.
