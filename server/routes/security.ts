import type { Express } from "express";
import { storage } from "../storage";
import { getSessionInfo } from "../security/session";
import { getClientIp } from "../security/audit";
import { killSwitchService } from "../services/kill-switch";

export function registerSecurityRoutes(app: Express): void {
  app.get("/api/security/threat-summary", async (_req, res) => {
    try {
      const [allEvents, scannerEvents, rateLimitEvents, turnstileEvents] = await Promise.all([
        storage.getSecurityEvents({ limit: 500 }),
        storage.getSecurityEvents({ eventType: "scanner_tripwire", limit: 200 }),
        storage.getSecurityEvents({ eventType: "rate_limit_exceeded", limit: 200 }),
        storage.getSecurityEvents({ eventType: "turnstile_failed", limit: 200 }),
      ]);

      const formRateLimitEvents = allEvents.filter(
        (e) => e.eventType === "rate_limit_form_submission" || e.eventType === "rate_limit_contact_form"
      );

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const eventsLast24h = allEvents.filter((e) => e.createdAt && new Date(e.createdAt) >= last24h);
      const eventsLast7d = allEvents.filter((e) => e.createdAt && new Date(e.createdAt) >= last7d);

      const uniqueIPs = new Set(allEvents.map((e) => e.ipAddress).filter(Boolean));
      const topIPs: Record<string, number> = {};
      allEvents.forEach((e) => {
        if (e.ipAddress) {
          topIPs[e.ipAddress] = (topIPs[e.ipAddress] || 0) + 1;
        }
      });
      const sortedIPs = Object.entries(topIPs)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count }));

      const topPaths: Record<string, number> = {};
      scannerEvents.forEach((e) => {
        const details = e.details as Record<string, any>;
        const path = details?.path || "unknown";
        topPaths[path] = (topPaths[path] || 0) + 1;
      });
      const sortedPaths = Object.entries(topPaths)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([path, count]) => ({ path, count }));

      res.json({
        summary: {
          totalEvents: allEvents.length,
          eventsLast24h: eventsLast24h.length,
          eventsLast7d: eventsLast7d.length,
          uniqueAttackerIPs: uniqueIPs.size,
          unresolvedEvents: allEvents.filter((e) => !e.resolved).length,
        },
        breakdown: {
          scannerTrips: scannerEvents.length,
          rateLimitHits: rateLimitEvents.length,
          formRateLimits: formRateLimitEvents.length,
          turnstileFailures: turnstileEvents.length,
        },
        topOffendingIPs: sortedIPs,
        topScannedPaths: sortedPaths,
        recentEvents: allEvents.slice(0, 20),
        cloudflareIntegration: {
          turnstileEnabled: !!process.env.TURNSTILE_SECRET_KEY,
          customDomainConfigured: !!process.env.APP_DOMAIN,
          trustProxyEnabled: true,
        },
      });
    } catch (error) {
      console.error("Failed to fetch threat summary:", error);
      res.status(500).json({ error: "Failed to fetch threat summary" });
    }
  });

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
        scannerTripwires: true,
        cloudflareProxy: true,
        turnstileVerification: !!process.env.TURNSTILE_SECRET_KEY,
        formRateLimiting: true,
        contactFormRateLimiting: true,
        customDomainCors: !!process.env.APP_DOMAIN,
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

  app.get("/api/security/kill-switch", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const state = killSwitchService.getState();
    res.json(state);
  });

  app.post("/api/security/kill-switch/activate", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (req.dbUser?.role !== "admin") {
      return res.status(403).json({ error: "Admin role required" });
    }
    try {
      const { reason } = req.body || {};
      const userId = req.user.id || "unknown";
      const recoveryKey = killSwitchService.activate(userId, reason);
      await storage.createSecurityEvent({
        eventType: "kill_switch_activated",
        userId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
        details: { reason: reason || "Emergency lockdown activated" },
        severity: "critical",
      });
      res.json({ recoveryKey });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to activate kill switch" });
    }
  });

  app.post("/api/security/kill-switch/deactivate", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (req.dbUser?.role !== "admin") {
      return res.status(403).json({ error: "Admin role required" });
    }
    try {
      const { recoveryKey } = req.body || {};
      if (!recoveryKey) {
        return res.status(400).json({ error: "Recovery key is required" });
      }
      const userId = req.user.id || "unknown";
      killSwitchService.deactivate(userId, recoveryKey);
      await storage.createSecurityEvent({
        eventType: "kill_switch_deactivated",
        userId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
        details: { message: "Kill switch deactivated" },
        severity: "critical",
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to deactivate kill switch" });
    }
  });
}
