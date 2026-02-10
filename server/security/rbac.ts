import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { teamMembers, roles, matterPermissions } from "@shared/models/tables";
import { eq, and } from "drizzle-orm";

const roleCache = new Map<string, { role: string; permissions: string[]; ts: number }>();
const CACHE_TTL = 60_000;

setInterval(() => {
  const now = Date.now();
  Array.from(roleCache.entries()).forEach(([key, entry]) => {
    if (now - entry.ts > CACHE_TTL) {
      roleCache.delete(key);
    }
  });
}, CACHE_TTL);

function getUserId(req: Request): string | null {
  return (req as any).user?.claims?.sub || null;
}

async function resolveUserRole(userId: string): Promise<{ role: string; permissions: string[] } | null> {
  const cached = roleCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached;
  }

  const [member] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  if (!member) return null;

  const [roleRecord] = await db
    .select({ permissions: roles.permissions })
    .from(roles)
    .where(eq(roles.name, member.role))
    .limit(1);

  const result = {
    role: member.role,
    permissions: (roleRecord?.permissions as string[]) || [],
    ts: Date.now(),
  };

  roleCache.set(userId, result);
  return result;
}

export function requirePermission(...perms: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(403).json({ error: "Authentication required" });
      }

      const userRole = await resolveUserRole(userId);
      if (!userRole) {
        return res.status(403).json({ error: "No team member record found" });
      }

      if (userRole.role === "admin") {
        return next();
      }

      const hasAll = perms.every((p) => userRole.permissions.includes(p));
      if (!hasAll) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      next();
    } catch (err) {
      console.error("RBAC permission check error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function requireMatterAccess(minLevel: "read" | "full" | "billing_only") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(403).json({ error: "Authentication required" });
      }

      const matterId = req.params.matterId || req.body?.matterId;
      if (!matterId) {
        return res.status(400).json({ error: "Matter ID required" });
      }

      const userRole = await resolveUserRole(userId);
      if (!userRole) {
        return res.status(403).json({ error: "No team member record found" });
      }

      if (userRole.role === "admin") {
        return next();
      }

      const [matterPerm] = await db
        .select({ accessLevel: matterPermissions.accessLevel })
        .from(matterPermissions)
        .where(
          and(
            eq(matterPermissions.matterId, matterId),
            eq(matterPermissions.userId, userId),
          ),
        )
        .limit(1);

      if (matterPerm) {
        const granted = matterPerm.accessLevel;
        if (granted === "full") {
          return next();
        }
        if (minLevel === "read" && (granted === "read" || granted === "full")) {
          return next();
        }
        if (minLevel === "billing_only" && (granted === "billing_only" || granted === "full")) {
          return next();
        }
        if (minLevel === granted) {
          return next();
        }
        return res.status(403).json({ error: "Insufficient matter access" });
      }

      const hasGlobalAccess = userRole.permissions.includes(`matter:${minLevel}`) ||
        userRole.permissions.includes("matter:full");
      if (hasGlobalAccess) {
        return next();
      }

      return res.status(403).json({ error: "Insufficient matter access" });
    } catch (err) {
      console.error("RBAC matter access check error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(403).json({ error: "Authentication required" });
      }

      const userRole = await resolveUserRole(userId);
      if (!userRole || userRole.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      next();
    } catch (err) {
      console.error("RBAC admin check error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const userRole = await resolveUserRole(userId);
  if (!userRole) return [];
  if (userRole.role === "admin") return ["*"];
  return userRole.permissions;
}
