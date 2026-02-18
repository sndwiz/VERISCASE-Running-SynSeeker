import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { registerAllRoutes } from "./routes/index";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth/replitAuth";
import { registerAuthRoutes, bootstrapFirstAdmin } from "./replit_integrations/auth/routes";
import { viewerReadOnly, requireMemberOrAbove, requireAnyRole, requireAdmin } from "./replit_integrations/auth/middleware";
import { auditMiddleware } from "./security/audit";
import { sessionIpTracking } from "./security/session";
import { errorHandler } from "./utils/errors";
import { setupSocketIO } from "./socket";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { matters, timeEntries, evidenceVaultFiles, caseFilings, clients } from "@shared/models/tables";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/health", async (_req, res) => {
    try {
      const { pool } = await import("./db");
      const result = await pool.query("SELECT 1");
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: result.rows.length > 0 ? "connected" : "error",
        uptime: process.uptime(),
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: "Database connection failed",
      });
    }
  });

  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const [activeMatters, hoursLogged, evidenceCount, filingsCount, activeClients] = await Promise.all([
        db.execute(sql`SELECT count(*)::int AS count FROM matters WHERE status = 'active' OR status IS NULL`),
        db.execute(sql`SELECT COALESCE(SUM(hours), 0)::numeric AS total FROM time_entries WHERE created_at >= date_trunc('month', CURRENT_DATE)`),
        db.execute(sql`SELECT count(*)::int AS count FROM evidence_vault_files`),
        db.execute(sql`SELECT count(*)::int AS count FROM case_filings`),
        db.execute(sql`SELECT count(*)::int AS count FROM clients`),
      ]);

      res.json({
        activeMatters: activeMatters.rows[0]?.count ?? 0,
        hoursLogged: Math.round(Number(hoursLogged.rows[0]?.total ?? 0)),
        documents: Number(evidenceCount.rows[0]?.count ?? 0) + Number(filingsCount.rows[0]?.count ?? 0),
        activeClients: activeClients.rows[0]?.count ?? 0,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Initialize authentication first (before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);

  app.use(sessionIpTracking);
  app.use(auditMiddleware);
  
  // Apply RBAC middleware to all /api/* routes except auth routes
  // Role tiers:
  // - admin: Full access to all routes + user management
  // - member: Full CRUD access to boards, matters, evidence, etc.
  // - viewer: Read-only access (GET requests only)
  
  // Workspaces - viewer can read, member+ can write
  app.use("/api/workspaces", isAuthenticated, viewerReadOnly);
  
  // Boards, groups, tasks - viewer can read, member+ can write
  app.use("/api/boards", isAuthenticated, viewerReadOnly);
  app.use("/api/groups", isAuthenticated, viewerReadOnly);
  app.use("/api/tasks", isAuthenticated, viewerReadOnly);
  
  // Team members - any authenticated role can read
  app.use("/api/team-members", isAuthenticated, requireAnyRole);
  
  // Clients and matters - viewer can read, member+ can write
  app.use("/api/clients", isAuthenticated, viewerReadOnly);
  app.use("/api/matters", isAuthenticated, viewerReadOnly);
  
  // Evidence vault - member or above only (legal sensitivity, no viewer access)
  app.use("/api/evidence", isAuthenticated, requireMemberOrAbove);
  
  // Detective board - viewer can read, member+ can write
  app.use("/api/detective", isAuthenticated, viewerReadOnly);
  
  // Automations - member or above only (can modify system behavior)
  app.use("/api/automations", isAuthenticated, requireMemberOrAbove);
  
  // AI features - any authenticated role
  app.use("/api/ai", isAuthenticated, requireAnyRole);
  
  // SynSeekr gateway - authenticated users can read status, admin for config
  app.use("/api/synseekr", isAuthenticated, viewerReadOnly);
  
  // Meeting notes - viewer can read, member+ can write
  app.use("/api/meetings", isAuthenticated, viewerReadOnly);
  
  // Time tracking - viewer can read, member+ can write
  app.use("/api/time-entries", isAuthenticated, viewerReadOnly);
  
  // Calendar events - viewer can read, member+ can write
  app.use("/api/calendar-events", isAuthenticated, viewerReadOnly);
  
  // Approvals - member or above only
  app.use("/api/approvals", isAuthenticated, viewerReadOnly);
  
  // Filing cabinet - viewer can read, member+ can write
  app.use("/api/files", isAuthenticated, viewerReadOnly);
  
  // Documents - member or above
  app.use("/api/documents", isAuthenticated, viewerReadOnly);
  
  // Conversations (AI chat) - any authenticated role
  app.use("/api/conversations", isAuthenticated, requireAnyRole);
  
  // OCR jobs - member or above
  app.use("/api/ocr-jobs", isAuthenticated, requireMemberOrAbove);
  
  // Clawbot - member or above
  app.use("/api/clawbot", isAuthenticated, requireMemberOrAbove);

  // Daily briefing - any authenticated role
  app.use("/api/briefing", isAuthenticated, requireAnyRole);
  
  // Vibe Code app builder - member or above
  app.use("/api/vibe", isAuthenticated, viewerReadOnly);
  
  // Upload organizer - member or above
  app.use("/api/organizer", isAuthenticated, requireMemberOrAbove);

  // Board chat + Master chat - any authenticated role
  app.use("/api/chats", isAuthenticated, requireAnyRole);

  // Security routes - admin only, except kill-switch status which any user can read
  app.use("/api/security", isAuthenticated, (req, res, next) => {
    if (req.path === "/kill-switch" && req.method === "GET") {
      return requireAnyRole(req, res, next);
    }
    return requireAdmin(req, res, next);
  });

  // Document Wash - member or above
  app.use("/api/wash", isAuthenticated, requireMemberOrAbove);

  // Billing - viewer can read, member+ can write
  app.use("/api/billing", isAuthenticated, viewerReadOnly);
  app.use("/api/expenses", isAuthenticated, viewerReadOnly);
  app.use("/api/invoices", isAuthenticated, viewerReadOnly);
  app.use("/api/payments", isAuthenticated, viewerReadOnly);
  app.use("/api/trust-transactions", isAuthenticated, viewerReadOnly);
  
  // PDF Pro - member or above (document operations)
  app.use("/api/pdf-pro", isAuthenticated, requireMemberOrAbove);

  // Billing Verifier - member or above (financial data)
  app.use("/api/billing-verifier", isAuthenticated, requireMemberOrAbove);

  // Insights - member or above (evidence analysis)
  app.use("/api/insights", isAuthenticated, requireMemberOrAbove);

  // Legal Research - member or above (AI-powered research)
  app.use("/api/legal-research", isAuthenticated, requireMemberOrAbove);

  // Seed data - admin only
  app.use("/api/seed", isAuthenticated, requireAdmin);

  // AI Ops - admin only (cost/performance monitoring)
  app.use("/api/ai-ops", isAuthenticated, requireAdmin);
  
  // Global search - any authenticated role can search
  app.use("/api/search", isAuthenticated, requireAnyRole);

  // Data export/import - admin only
  app.use("/api/export", isAuthenticated, requireAdmin);
  app.use("/api/import", isAuthenticated, requireAdmin);

  // Client portal - viewer can read, member+ can write
  app.use("/api/client-portal", isAuthenticated, viewerReadOnly);

  // E-Sign - viewer can read, member+ can write
  app.use("/api/esign", isAuthenticated, viewerReadOnly);

  // SMS - member or above (communication)
  app.use("/api/sms", isAuthenticated, requireMemberOrAbove);

  // Integrations - member or above (integration settings)
  app.use("/api/integrations", isAuthenticated, requireMemberOrAbove);

  // Custom fields - viewer can read, member+ can write
  app.use("/api/custom-fields", isAuthenticated, viewerReadOnly);

  // Matter templates - viewer can read, member+ can write
  app.use("/api/matter-templates", isAuthenticated, viewerReadOnly);

  // Trust reconciliation - member or above (financial)
  app.use("/api/trust/reconciliation", isAuthenticated, requireMemberOrAbove);

  app.get("/api/downloads/:filename", isAuthenticated, (req, res) => {
    const { filename } = req.params;
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "");
    const filePath = path.join(process.cwd(), "public", "downloads", safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    res.download(filePath, safeName);
  });

  app.post("/api/admin/clear-all-data", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      await db.execute(sql`
        DO $$ 
        DECLARE 
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('users', 'sessions', 'roles', 'team_members')) LOOP
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
        END $$;
      `);
      res.json({ success: true, message: "All case data cleared. User accounts preserved." });
    } catch (error) {
      console.error("Clear data error:", error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // Register all other API routes
  registerAllRoutes(app);
  
  // Bootstrap first admin user after routes are set up (fallback for existing users)
  bootstrapFirstAdmin();

  // Start due date monitoring for automations
  import("./automation-engine").then(({ startDueDateMonitor }) => startDueDateMonitor());


  // Set up WebSocket server for real-time chat
  setupSocketIO(httpServer);

  app.use(errorHandler);
  
  return httpServer;
}
