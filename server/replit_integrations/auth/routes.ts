import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { requireAdmin } from "./middleware";
import type { UserRole } from "@shared/models/auth";

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
