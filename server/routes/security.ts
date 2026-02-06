import type { Express } from "express";
import { storage } from "../storage";
import { getSessionInfo } from "../security/session";
import { getClientIp } from "../security/audit";

export function registerSecurityRoutes(app: Express): void {
  app.get("/api/security/audit-logs", async (req, res) => {
    try {
      const { userId, action, resourceType, limit, offset } = req.query;
      const logs = await storage.getAuditLogs({
        userId: userId as string | undefined,
        action: action as string | undefined,
        resourceType: resourceType as string | undefined,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });
      const count = await storage.getAuditLogCount({
        userId: userId as string | undefined,
        action: action as string | undefined,
        resourceType: resourceType as string | undefined,
      });
      res.json({ logs, total: count });
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/security/events", async (req, res) => {
    try {
      const { eventType, severity, resolved, limit } = req.query;
      const events = await storage.getSecurityEvents({
        eventType: eventType as string | undefined,
        severity: severity as string | undefined,
        resolved: resolved === "true" ? true : resolved === "false" ? false : undefined,
        limit: limit ? parseInt(limit as string) : 100,
      });
      res.json(events);
    } catch (error) {
      console.error("Failed to fetch security events:", error);
      res.status(500).json({ error: "Failed to fetch security events" });
    }
  });

  app.patch("/api/security/events/:id/resolve", async (req, res) => {
    try {
      const event = await storage.resolveSecurityEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Security event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Failed to resolve security event:", error);
      res.status(500).json({ error: "Failed to resolve security event" });
    }
  });

  app.get("/api/security/session-info", (req, res) => {
    const info = getSessionInfo(req);
    res.json({
      ...info,
      currentIp: getClientIp(req),
    });
  });

  app.get("/api/security/status", async (req, res) => {
    try {
      const [
        recentEvents,
        unresolvedEvents,
        recentLogs,
        totalLogs,
      ] = await Promise.all([
        storage.getSecurityEvents({ limit: 5 }),
        storage.getSecurityEvents({ resolved: false, limit: 50 }),
        storage.getAuditLogs({ limit: 10 }),
        storage.getAuditLogCount(),
      ]);

      const securityFeatures = {
        securityHeaders: true,
        rateLimiting: true,
        corsProtection: true,
        xssSanitization: true,
        sessionIpTracking: true,
        auditLogging: true,
        rbacEnabled: true,
        encryptedSessions: true,
        httpOnlyCookies: true,
        secureCookies: true,
        sameSiteCookies: true,
        inputValidation: true,
        ssrfProtection: true,
        evidenceChainOfCustody: true,
      };

      res.json({
        features: securityFeatures,
        stats: {
          totalAuditLogs: totalLogs,
          unresolvedSecurityEvents: unresolvedEvents.length,
          recentEvents,
          recentLogs,
        },
      });
    } catch (error) {
      console.error("Failed to fetch security status:", error);
      res.status(500).json({ error: "Failed to fetch security status" });
    }
  });
}
