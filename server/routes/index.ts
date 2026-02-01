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

export function registerAllRoutes(app: Express): void {
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
}
