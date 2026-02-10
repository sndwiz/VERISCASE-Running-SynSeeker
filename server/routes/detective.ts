import type { Express } from "express";
import { storage } from "../storage";
import {
  insertDetectiveNodeSchema,
  updateDetectiveNodeSchema,
  insertDetectiveConnectionSchema,
  updateDetectiveConnectionSchema,
} from "@shared/schema";
import { z } from "zod";

function spreadPosition(index: number, total: number, baseX = 200, baseY = 200) {
  const cols = Math.ceil(Math.sqrt(total));
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: baseX + col * 280, y: baseY + row * 220 };
}

export function registerDetectiveRoutes(app: Express): void {
  app.post("/api/matters/:matterId/detective/sync", async (req, res) => {
    try {
      const { matterId } = req.params;
      const existingNodes = await storage.getDetectiveNodes(matterId);
      const existingConnections = await storage.getDetectiveConnections(matterId);

      const contacts = await storage.getMatterContacts(matterId);
      const timeline = await storage.getTimelineEvents(matterId);
      const evidence = await storage.getEvidenceVaultFiles(matterId);

      const linkedContactIds = new Set(existingNodes.filter(n => n.linkedContactId).map(n => n.linkedContactId));
      const linkedEvidenceIds = new Set(existingNodes.filter(n => n.linkedEvidenceId).map(n => n.linkedEvidenceId));
      const existingEventTitles = new Set(existingNodes.filter(n => n.type === "event").map(n => n.title.toLowerCase()));

      const created: any[] = [];
      let idx = existingNodes.length;

      for (const contact of contacts) {
        if (linkedContactIds.has(contact.id)) continue;
        const pos = spreadPosition(idx++, contacts.length + evidence.length + timeline.length, 100, 400);
        const node = await storage.createDetectiveNode({
          matterId,
          type: "person",
          title: contact.name,
          description: `Role: ${contact.role || "Unknown"}${contact.email ? `\nEmail: ${contact.email}` : ""}${contact.notes ? `\nNotes: ${contact.notes}` : ""}`,
          linkedContactId: contact.id,
          position: pos,
          color: "#8b5cf6",
          isInferred: true,
          confidenceScore: 0.7,
          reliabilityLevel: "moderate",
        });
        created.push({ type: "person", id: node.id, title: node.title, source: "contact" });
      }

      for (const item of evidence) {
        if (linkedEvidenceIds.has(item.id)) continue;
        const pos = spreadPosition(idx++, contacts.length + evidence.length + timeline.length, 500, 100);
        const node = await storage.createDetectiveNode({
          matterId,
          type: "evidence",
          title: item.originalName,
          description: `Type: ${item.evidenceType || "Unknown"}\nConfidentiality: ${item.confidentiality || "standard"}${item.description ? `\n${item.description}` : ""}`,
          linkedEvidenceId: item.id,
          position: pos,
          color: "#3b82f6",
          isInferred: true,
          confidenceScore: 0.8,
        });
        created.push({ type: "evidence", id: node.id, title: node.title, source: "evidence_vault" });
      }

      for (const ev of timeline) {
        if (existingEventTitles.has(ev.title.toLowerCase())) continue;
        const pos = spreadPosition(idx++, contacts.length + evidence.length + timeline.length, 900, 300);
        const node = await storage.createDetectiveNode({
          matterId,
          type: "event",
          title: ev.title,
          description: `Date: ${ev.eventDate}\nType: ${ev.eventType || "general"}${ev.description ? `\n${ev.description}` : ""}`,
          position: pos,
          color: "#f59e0b",
          isInferred: true,
          confidenceScore: 0.9,
        });
        created.push({ type: "event", id: node.id, title: node.title, source: "timeline" });
      }

      const autoConnections: any[] = [];
      const personNodes = [...existingNodes.filter(n => n.type === "person"), ...created.filter(c => c.type === "person")];
      const eventNodes = [...existingNodes.filter(n => n.type === "event"), ...created.filter(c => c.type === "event")];
      const allNodes = await storage.getDetectiveNodes(matterId);
      const existingPairs = new Set(existingConnections.map(c => `${c.sourceNodeId}:${c.targetNodeId}`));

      for (const person of allNodes.filter(n => n.type === "person")) {
        for (const event of allNodes.filter(n => n.type === "event")) {
          const pairKey = `${person.id}:${event.id}`;
          const reversePairKey = `${event.id}:${person.id}`;
          if (existingPairs.has(pairKey) || existingPairs.has(reversePairKey)) continue;

          const eventDesc = (event.description || "").toLowerCase();
          const personName = person.title.toLowerCase();
          const nameParts = personName.split(/\s+/);
          const mentioned = nameParts.some(part => part.length > 2 && eventDesc.includes(part));
          if (mentioned) {
            const conn = await storage.createDetectiveConnection({
              matterId,
              sourceNodeId: person.id,
              targetNodeId: event.id,
              label: "present at",
              connectionType: "related",
              strength: 2,
              notes: "Auto-linked: person name found in event description",
              isInferred: true,
              confidenceScore: 0.5,
            });
            autoConnections.push(conn);
            existingPairs.add(pairKey);
          }
        }
      }

      res.json({
        synced: created.length,
        autoConnections: autoConnections.length,
        created,
        message: created.length > 0
          ? `Synced ${created.length} items to detective board with ${autoConnections.length} auto-connections`
          : "Board is already up to date with matter data",
      });
    } catch (error) {
      console.error("[Detective Sync] Error:", error);
      res.status(500).json({ error: "Failed to sync matter data to detective board" });
    }
  });

  app.get("/api/matters/:matterId/detective/unaccounted-time", async (req, res) => {
    try {
      const { matterId } = req.params;
      const nodes = await storage.getDetectiveNodes(matterId);
      const connections = await storage.getDetectiveConnections(matterId);

      const personNodes = nodes.filter(n => n.type === "person");
      const eventNodes = nodes.filter(n => n.type === "event");

      const extractDate = (text: string): Date | null => {
        const patterns = [
          /(\d{4}-\d{2}-\d{2})/,
          /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
          /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s*\d{2,4}/i,
        ];
        for (const p of patterns) {
          const m = text.match(p);
          if (m) {
            const d = new Date(m[0]);
            if (!isNaN(d.getTime())) return d;
          }
        }
        return null;
      }

      const analysis: any[] = [];

      for (const person of personNodes) {
        const linkedEvents = eventNodes.filter(ev =>
          connections.some(c =>
            (c.sourceNodeId === person.id && c.targetNodeId === ev.id) ||
            (c.targetNodeId === person.id && c.sourceNodeId === ev.id)
          )
        );

        const datedEvents = linkedEvents
          .map(ev => ({
            event: ev,
            date: extractDate(ev.title) || extractDate(ev.description || ""),
          }))
          .filter(e => e.date !== null)
          .sort((a, b) => a.date!.getTime() - b.date!.getTime());

        const gaps: any[] = [];
        for (let i = 0; i < datedEvents.length - 1; i++) {
          const curr = datedEvents[i];
          const next = datedEvents[i + 1];
          const diffMs = next.date!.getTime() - curr.date!.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (diffHours > 4) {
            const getLocation = (eventNode: any) => {
              const locConn = connections.find(c =>
                (c.sourceNodeId === eventNode.id || c.targetNodeId === eventNode.id) &&
                nodes.find(n => n.id === (c.sourceNodeId === eventNode.id ? c.targetNodeId : c.sourceNodeId))?.type === "location"
              );
              if (!locConn) return null;
              return nodes.find(n => n.id === (locConn.sourceNodeId === eventNode.id ? locConn.targetNodeId : locConn.sourceNodeId));
            };

            const locA = getLocation(curr.event);
            const locB = getLocation(next.event);

            gaps.push({
              from: { event: curr.event.title, date: curr.date!.toISOString(), location: locA?.title || null },
              to: { event: next.event.title, date: next.date!.toISOString(), location: locB?.title || null },
              gapHours: Math.round(diffHours * 10) / 10,
              gapDays: Math.round(diffDays * 10) / 10,
              severity: diffDays > 7 ? "critical" : diffDays > 1 ? "high" : diffHours > 12 ? "medium" : "low",
              locationChange: locA && locB && locA.id !== locB.id,
              investigationLead: diffDays > 1
                ? `${person.title} is unaccounted for ${Math.round(diffDays)} days between "${curr.event.title}" and "${next.event.title}". This gap provides opportunity window.`
                : `${person.title} has a ${Math.round(diffHours)}hr gap between events. Verify whereabouts.`,
            });
          }
        }

        const totalAccountedEvents = linkedEvents.length;
        const totalKnownEvents = eventNodes.length;
        const coverageRatio = totalKnownEvents > 0 ? totalAccountedEvents / totalKnownEvents : 0;

        analysis.push({
          person: { id: person.id, title: person.title },
          accountedEvents: totalAccountedEvents,
          totalEvents: totalKnownEvents,
          coveragePercent: Math.round(coverageRatio * 100),
          gaps,
          opportunityScore: gaps.length > 0
            ? Math.min(1, gaps.reduce((sum, g) => sum + (g.gapDays > 1 ? 0.3 : 0.1), 0) + (1 - coverageRatio) * 0.5)
            : (1 - coverageRatio) * 0.3,
          unlinkedEventCount: totalKnownEvents - totalAccountedEvents,
        });
      }

      analysis.sort((a, b) => b.opportunityScore - a.opportunityScore);

      res.json({
        persons: analysis,
        summary: {
          totalPersons: personNodes.length,
          totalEvents: eventNodes.length,
          personsWithGaps: analysis.filter(a => a.gaps.length > 0).length,
          totalGaps: analysis.reduce((sum, a) => sum + a.gaps.length, 0),
          highestOpportunity: analysis[0] || null,
        },
      });
    } catch (error) {
      console.error("[Detective Unaccounted Time] Error:", error);
      res.status(500).json({ error: "Failed to analyze unaccounted time" });
    }
  });

  app.get("/api/matters/:matterId/detective/nodes", async (req, res) => {
    try {
      const nodes = await storage.getDetectiveNodes(req.params.matterId);
      res.json(nodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch detective nodes" });
    }
  });

  app.post("/api/matters/:matterId/detective/nodes", async (req, res) => {
    try {
      const data = insertDetectiveNodeSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const node = await storage.createDetectiveNode(data);
      res.status(201).json(node);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create detective node" });
    }
  });

  app.patch("/api/detective/nodes/:id", async (req, res) => {
    try {
      const data = updateDetectiveNodeSchema.parse(req.body);
      const node = await storage.updateDetectiveNode(req.params.id, data);
      if (!node) {
        return res.status(404).json({ error: "Detective node not found" });
      }
      res.json(node);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update detective node" });
    }
  });

  app.delete("/api/detective/nodes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDetectiveNode(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Detective node not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete detective node" });
    }
  });

  app.get("/api/matters/:matterId/detective/connections", async (req, res) => {
    try {
      const connections = await storage.getDetectiveConnections(req.params.matterId);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch detective connections" });
    }
  });

  app.post("/api/matters/:matterId/detective/connections", async (req, res) => {
    try {
      const data = insertDetectiveConnectionSchema.parse({
        ...req.body,
        matterId: req.params.matterId,
      });
      const connection = await storage.createDetectiveConnection(data);
      res.status(201).json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create detective connection" });
    }
  });

  app.patch("/api/detective/connections/:id", async (req, res) => {
    try {
      const data = updateDetectiveConnectionSchema.parse(req.body);
      const connection = await storage.updateDetectiveConnection(req.params.id, data);
      if (!connection) {
        return res.status(404).json({ error: "Detective connection not found" });
      }
      res.json(connection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update detective connection" });
    }
  });

  app.delete("/api/detective/connections/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDetectiveConnection(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Detective connection not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete detective connection" });
    }
  });
}
