import type { Express } from "express";
import { seedDemoData } from "../seed-demo-data";
import { storage } from "../storage";

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

  app.get("/api/export-case-data", async (_req, res) => {
    try {
      const clients = await storage.getClients();
      const matters = await storage.getMatters();

      const mattersWithDetails = await Promise.all(
        matters.map(async (matter) => {
          const contacts = await storage.getMatterContacts(matter.id);
          const timeline = await storage.getTimelineEvents(matter.id);
          const files = await storage.getMatterFiles(matter.id);
          let evidence: any[] = [];
          try {
            evidence = await storage.getEvidenceVaultFiles(matter.id);
          } catch (_e) {}
          let detectiveNodes: any[] = [];
          let detectiveConnections: any[] = [];
          try {
            const boards = await storage.getBoards();
            const matterBoard = boards.find((b: any) => b.matterId === matter.id);
            if (matterBoard) {
              detectiveNodes = await storage.getDetectiveNodes(matter.id);
              detectiveConnections = await storage.getDetectiveConnections(matter.id);
            }
          } catch (_e) {}

          return {
            ...matter,
            contacts,
            timeline,
            evidence: evidence.map((e: any) => ({
              title: e.title,
              evidenceType: e.evidenceType,
              status: e.status,
              description: e.description,
              batesNumber: e.batesNumber,
              custodyChain: e.custodyChain,
            })),
            files: files.map((f: any) => ({
              fileName: f.fileName,
              extension: f.extension,
              sizeBytes: f.sizeBytes,
              confidentiality: f.confidentiality,
              profile: f.profile,
            })),
            detectiveBoard: {
              nodes: detectiveNodes.map((n: any) => ({
                title: n.title,
                type: n.type,
                description: n.description,
                color: n.color,
                position: n.position,
                metadata: n.metadata,
              })),
              connections: detectiveConnections.map((c: any) => ({
                sourceNodeTitle: detectiveNodes.find((n: any) => n.id === c.sourceNodeId)?.title,
                targetNodeTitle: detectiveNodes.find((n: any) => n.id === c.targetNodeId)?.title,
                connectionType: c.connectionType,
                label: c.label,
                strength: c.strength,
                notes: c.notes,
              })),
            },
          };
        })
      );

      const exportData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        system: "Vericase SynSeeker",
        data: {
          clients: clients.map((c: any) => ({
            name: c.name,
            type: c.type,
            email: c.email,
            phone: c.phone,
            address: c.address,
            notes: c.notes,
          })),
          matters: mattersWithDetails,
        },
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=vericase-case-data-export.json");
      res.json(exportData);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export case data" });
    }
  });
}
