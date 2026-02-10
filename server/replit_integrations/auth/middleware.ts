import type { RequestHandler } from "express";
import { authStorage } from "./storage";
import type { UserRole } from "@shared/models/auth";
import { logger } from "../../utils/logger";

export type { UserRole };

export const requireRole = (...allowedRoles: UserRole[]): RequestHandler => {
  return async (req, res, next) => {
    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const dbUser = await authStorage.getUser(req.user.claims.sub);

      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!allowedRoles.includes(dbUser.role as UserRole)) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions" });
      }

      req.dbUser = dbUser;
      next();
    } catch (error) {
      logger.error("Role check error", { error: String(error) });
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

export const requireAdmin: RequestHandler = requireRole("admin");

export const requireMemberOrAbove: RequestHandler = requireRole("admin", "member");

export const requireAnyRole: RequestHandler = requireRole("admin", "member", "viewer");

export const viewerReadOnly: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = await authStorage.getUser(req.user.claims.sub);

    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    req.dbUser = dbUser;

    if (dbUser.role === "admin" || dbUser.role === "member") {
      return next();
    }

    if (dbUser.role === "viewer") {
      const readMethods = ["GET", "HEAD", "OPTIONS"];
      if (readMethods.includes(req.method)) {
        return next();
      }
      return res.status(403).json({ message: "Forbidden: viewers have read-only access" });
    }

    return res.status(403).json({ message: "Forbidden: insufficient permissions" });
  } catch (error) {
    logger.error("Role check error", { error: String(error) });
    return res.status(500).json({ message: "Internal server error" });
  }
};
