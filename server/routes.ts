import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerAllRoutes } from "./routes/index";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth/replitAuth";
import { registerAuthRoutes, bootstrapFirstAdmin } from "./replit_integrations/auth/routes";
import { viewerReadOnly, requireMemberOrAbove, requireAnyRole, requireAdmin } from "./replit_integrations/auth/middleware";
import { auditMiddleware } from "./security/audit";
import { sessionIpTracking } from "./security/session";
import { errorHandler } from "./utils/errors";
import { setupSocketIO } from "./socket";

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
  
  // Boards, groups, tasks - viewer can read, member+ can write
  app.use("/api/boards", isAuthenticated, viewerReadOnly);
  app.use("/api/groups", isAuthenticated, viewerReadOnly);
  app.use("/api/tasks", isAuthenticated, viewerReadOnly);
  
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

  // Security dashboard - admin only
  app.use("/api/security", isAuthenticated, requireAdmin);

  // Document Wash - member or above
  app.use("/api/wash", isAuthenticated, requireMemberOrAbove);
  
  // Register all other API routes
  registerAllRoutes(app);
  
  // Bootstrap first admin user after routes are set up (fallback for existing users)
  bootstrapFirstAdmin();

  // Set up WebSocket server for real-time chat
  setupSocketIO(httpServer);

  app.use(errorHandler);
  
  return httpServer;
}
