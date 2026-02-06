import type { Express } from "express";
import { registerBoardRoutes } from "./boards";
import { registerGroupRoutes } from "./groups";
import { registerTaskRoutes } from "./tasks";
import { registerClientRoutes } from "./clients";
import { registerMatterRoutes } from "./matters";
import { registerEvidenceRoutes } from "./evidence";
import { registerDetectiveRoutes } from "./detective";
import { registerAutomationRoutes } from "./automations";
import { registerAIRoutes } from "./ai";
import { registerFilingRoutes } from "./filing";
import { registerSeedRoutes } from "./seed";
import { registerTimeTrackingRoutes } from "./time-tracking";
import { registerCalendarRoutes } from "./calendar";
import { registerApprovalRoutes } from "./approvals";
import { registerBriefingRoutes } from "./briefing";
import clawbotRouter from "./clawbot";
import documentsRouter from "./documents";
import synseekrRouter from "./synseekr";
import { registerMeetingRoutes } from "./meetings";
import { registerVibeCodeRoutes } from "./vibe-code";

export function registerAllRoutes(app: Express): void {
  // Clawbot gateway integration
  app.use('/api/clawbot', clawbotRouter);
  // Document and Form Maker
  app.use('/api/documents', documentsRouter);
  // SynSeekr server gateway
  app.use('/api/synseekr', synseekrRouter);
  registerBoardRoutes(app);
  registerGroupRoutes(app);
  registerTaskRoutes(app);
  registerClientRoutes(app);
  registerMatterRoutes(app);
  registerEvidenceRoutes(app);
  registerDetectiveRoutes(app);
  registerAutomationRoutes(app);
  registerAIRoutes(app);
  registerFilingRoutes(app);
  registerSeedRoutes(app);
  registerTimeTrackingRoutes(app);
  registerCalendarRoutes(app);
  registerApprovalRoutes(app);
  registerBriefingRoutes(app);
  registerMeetingRoutes(app);
  registerVibeCodeRoutes(app);
}
