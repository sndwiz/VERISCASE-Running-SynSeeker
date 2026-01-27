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
}
