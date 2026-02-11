import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { requireAdmin } from "./middleware";
import type { UserRole } from "@shared/models/auth";

const AVATAR_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Bootstrap: Make the first user an admin if no admins exist
export async function bootstrapFirstAdmin(): Promise<void> {
  try {
    const users = await authStorage.getAllUsers();
    const admins = users.filter(u => u.role === "admin");
    
    if (admins.length === 0 && users.length > 0) {
      // Make the first user an admin
      const firstUser = users[0];
      await authStorage.updateUserRole(firstUser.id, "admin");
      console.log(`[Auth] Bootstrapped first admin: ${firstUser.email || firstUser.id}`);
    }
  } catch (error) {
    console.error("[Auth] Error bootstrapping first admin:", error);
  }
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get team members (all authenticated users can access)
  app.get("/api/team/members", isAuthenticated, async (_req, res) => {
    try {
      const users = await authStorage.getAllUsers();
      // Return simplified team member list (no sensitive data)
      const teamMembers = users.map(u => ({
        id: u.id,
        name: u.firstName && u.lastName 
          ? `${u.firstName} ${u.lastName}` 
          : u.email?.split("@")[0] || "User",
        email: u.email,
        color: getColorForUser(u.id)
      }));
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Admin: Get all users
  app.get("/api/admin/users", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const users = await authStorage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Update user role
  app.patch("/api/admin/users/:id/role", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = req.params.id as string;
      const { role } = req.body as { role: UserRole };
      
      if (!["admin", "member", "viewer"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await authStorage.updateUserRole(id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Admin: Get active sessions
  app.get("/api/admin/sessions", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { db } = await import("../../db");
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(sql`
        SELECT sid, sess, expire FROM sessions WHERE expire > NOW()
      `);
      const rows = result as unknown as any[];
      const currentSid = (req as any).sessionID;
      const sessions: any[] = [];
      for (const row of rows) {
        try {
          const sess = typeof row.sess === "string" ? JSON.parse(row.sess) : row.sess;
          const claims = sess?.passport?.user?.claims;
          if (!claims?.sub) continue;
          sessions.push({
            sid: row.sid,
            userId: claims.sub,
            email: claims.email || null,
            firstName: claims.first_name || null,
            lastName: claims.last_name || null,
            lastActivity: sess?.lastActivity || null,
            lastIp: sess?.lastIp || null,
            initialIp: sess?.initialIp || null,
            ipHistory: sess?.ipHistory || [],
            expiresAt: row.expire,
            isCurrent: row.sid === currentSid,
          });
        } catch {
          continue;
        }
      }
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ message: "Failed to fetch active sessions" });
    }
  });

  // Admin: Terminate a session
  app.delete("/api/admin/sessions/:sid", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { sid } = req.params;
      const currentUserSid = req.sessionID;
      if (sid === currentUserSid) {
        return res.status(400).json({ message: "Cannot terminate your own session" });
      }
      const { db } = await import("../../db");
      const { sql } = await import("drizzle-orm");
      const existing = await db.execute(sql`SELECT sid FROM sessions WHERE sid = ${sid}`);
      const existingRows = existing as unknown as any[];
      if (!existingRows || existingRows.length === 0) {
        return res.status(404).json({ message: "Session not found" });
      }
      await db.execute(sql`DELETE FROM sessions WHERE sid = ${sid}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error terminating session:", error);
      res.status(500).json({ message: "Failed to terminate session" });
    }
  });

  // Admin: Get team performance metrics
  app.get("/api/admin/performance", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const users = await authStorage.getAllUsers();
      const { storage } = await import("../../storage");
      
      // Get all tasks and time entries
      const allTasks = await storage.getTasks();
      const allTimeEntries = await storage.getTimeEntries();
      
      // Calculate individual performance for each user
      const userPerformance = users.map(user => {
        // Tasks assigned to user (check assignees array or owner field)
        const userTasks = allTasks.filter(task => 
          (task.owner && task.owner.id === user.id) || 
          (Array.isArray(task.assignees) && task.assignees.some(a => a.id === user.id))
        );
        
        const completedTasks = userTasks.filter(task => task.status === "done");
        const inProgressTasks = userTasks.filter(task => task.status === "working-on-it");
        const notStartedTasks = userTasks.filter(task => task.status === "not-started");
        
        // Time tracked by user
        const userTimeEntries = allTimeEntries.filter(entry => entry.userId === user.id);
        const totalHoursTracked = userTimeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
        const billableHours = userTimeEntries.filter(e => e.billableStatus === "billable").reduce((sum, entry) => sum + (entry.hours || 0), 0);
        
        // Calculate completion rate
        const completionRate = userTasks.length > 0 
          ? Math.round((completedTasks.length / userTasks.length) * 100) 
          : 0;
        
        return {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          metrics: {
            totalTasks: userTasks.length,
            completedTasks: completedTasks.length,
            inProgressTasks: inProgressTasks.length,
            notStartedTasks: notStartedTasks.length,
            completionRate,
            totalHoursTracked: Math.round(totalHoursTracked * 10) / 10,
            billableHours: Math.round(billableHours * 10) / 10,
          }
        };
      });
      
      // Calculate team-wide metrics
      const totalTasks = allTasks.length;
      const totalCompleted = allTasks.filter(t => t.status === "done").length;
      const totalInProgress = allTasks.filter(t => t.status === "working-on-it").length;
      const totalNotStarted = allTasks.filter(t => t.status === "not-started").length;
      const teamCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
      
      const totalHours = allTimeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
      const totalBillableHours = allTimeEntries.filter(e => e.billableStatus === "billable").reduce((sum, entry) => sum + (entry.hours || 0), 0);
      
      const teamMetrics = {
        totalMembers: users.length,
        totalTasks,
        completedTasks: totalCompleted,
        inProgressTasks: totalInProgress,
        notStartedTasks: totalNotStarted,
        teamCompletionRate,
        totalHoursTracked: Math.round(totalHours * 10) / 10,
        totalBillableHours: Math.round(totalBillableHours * 10) / 10,
      };
      
      res.json({
        teamMetrics,
        userPerformance
      });
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });
}
