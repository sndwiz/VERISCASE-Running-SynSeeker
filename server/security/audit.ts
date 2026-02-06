import type { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "../storage";
import type { InsertAuditLog } from "@shared/schema";

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function getUserFromRequest(req: Request): { userId: string | null; userEmail: string | null } {
  const user = req.user as any;
  if (!user?.claims) return { userId: null, userEmail: null };
  return {
    userId: user.claims.sub || null,
    userEmail: user.claims.email || null,
  };
}

function getResourceFromPath(path: string): { resourceType: string | null; resourceId: string | null } {
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "api") {
    const resourceType = parts[1];
    const resourceId = parts.length >= 3 ? parts[2] : null;
    return { resourceType, resourceId };
  }
  return { resourceType: null, resourceId: null };
}

function getActionFromMethod(method: string, path: string): string {
  const parts = path.split("/").filter(Boolean);
  const resource = parts.length >= 2 ? parts[1] : "unknown";

  switch (method.toUpperCase()) {
    case "GET": return `view_${resource}`;
    case "POST": return `create_${resource}`;
    case "PUT":
    case "PATCH": return `update_${resource}`;
    case "DELETE": return `delete_${resource}`;
    default: return `access_${resource}`;
  }
}

function getSeverityFromStatus(statusCode: number, method: string): string {
  if (statusCode >= 500) return "error";
  if (statusCode === 401 || statusCode === 403) return "warning";
  if (method === "DELETE") return "warning";
  if (statusCode >= 400) return "info";
  return "info";
}

const SENSITIVE_RESOURCES = new Set([
  "evidence", "documents", "approvals", "clients", "matters",
  "synseekr", "clawbot", "automations",
]);

const SKIP_PATHS = new Set([
  "/api/auth/user", "/api/login", "/api/callback", "/api/logout",
]);

export const auditMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith("/api")) return next();

  if (SKIP_PATHS.has(req.path)) return next();

  if (req.method === "GET") {
    const parts = req.path.split("/").filter(Boolean);
    const resource = parts.length >= 2 ? parts[1] : "";
    if (!SENSITIVE_RESOURCES.has(resource)) {
      return next();
    }
  }

  const startTime = Date.now();

  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    const duration = Date.now() - startTime;
    const { userId, userEmail } = getUserFromRequest(req);
    const { resourceType, resourceId } = getResourceFromPath(req.path);

    const logEntry: InsertAuditLog = {
      userId,
      userEmail,
      action: getActionFromMethod(req.method, req.path),
      resourceType,
      resourceId,
      method: req.method,
      path: req.path,
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"] || null,
      statusCode: res.statusCode,
      severity: getSeverityFromStatus(res.statusCode, req.method),
      metadata: {
        duration,
        contentLength: res.getHeader("content-length"),
      },
    };

    storage.createAuditLog(logEntry).catch((err) => {
      console.error("Audit log error:", err);
    });

    return originalEnd.apply(res, args as any);
  } as any;

  next();
};

export async function logAuthEvent(
  action: "login" | "logout" | "login_failed" | "token_refresh" | "session_expired",
  req: Request,
  metadata?: Record<string, any>
): Promise<void> {
  const { userId, userEmail } = getUserFromRequest(req);

  await storage.createAuditLog({
    userId,
    userEmail,
    action: `auth_${action}`,
    resourceType: "session",
    method: req.method,
    path: req.path,
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] || null,
    severity: action === "login_failed" ? "warning" : "info",
    metadata: metadata || {},
  }).catch((err) => {
    console.error("Auth audit log error:", err);
  });
}

export async function logSecurityEvent(
  eventType: string,
  req: Request,
  details?: Record<string, any>,
  severity: string = "warning"
): Promise<void> {
  const { userId } = getUserFromRequest(req);

  await storage.createSecurityEvent({
    eventType,
    userId,
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] || null,
    details: details || {},
    severity,
  }).catch((err) => {
    console.error("Security event log error:", err);
  });
}
