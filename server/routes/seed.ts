import type { Express } from "express";
import { seedDemoData } from "../seed-demo-data";

let seeded = false;

export function registerSeedRoutes(app: Express): void {
  app.post("/api/seed-demo-data", async (_req, res) => {
    if (seeded) {
      return res.status(400).json({ 
        error: "Demo data has already been seeded. Restart the server to seed again." 
      });
    }
    
    try {
      await seedDemoData();
      seeded = true;
      res.json({ 
        success: true, 
        message: "Demo data seeded successfully! Refresh the page to see the data." 
      });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ error: "Failed to seed demo data" });
    }
  });

  app.get("/api/seed-status", async (_req, res) => {
    res.json({ seeded });
  });
}
