import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertMeetingSchema } from "@shared/schema";
import { syncMeetingToCalendar, removeSyncedEvent } from "../services/calendar-sync";

const aiQuerySchema = z.object({
  query: z.string().min(1).max(2000),
});

function truncateContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + "... [truncated]";
}

export function registerMeetingRoutes(app: Express): void {
  app.get("/api/meetings", async (_req: Request, res: Response) => {
    const meetings = await storage.getMeetings();
    res.json(meetings);
  });

  app.get("/api/meetings/:id", async (req: Request, res: Response) => {
    const meeting = await storage.getMeeting(req.params.id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    res.json(meeting);
  });

  app.post("/api/meetings", async (req: Request, res: Response) => {
    const parsed = insertMeetingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const meeting = await storage.createMeeting(parsed.data);
    if (meeting.date) {
      syncMeetingToCalendar(meeting.id).catch(e => console.error("[meetings] Calendar sync error:", e));
    }
    res.status(201).json(meeting);
  });

  app.patch("/api/meetings/:id", async (req: Request, res: Response) => {
    const meeting = await storage.updateMeeting(req.params.id, req.body);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    if (meeting.date) {
      syncMeetingToCalendar(meeting.id).catch(e => console.error("[meetings] Calendar sync error:", e));
    }
    res.json(meeting);
  });

  app.delete("/api/meetings/:id", async (req: Request, res: Response) => {
    removeSyncedEvent("meeting", req.params.id).catch(e => console.error("[meetings] Calendar unsync error:", e));
    const success = await storage.deleteMeeting(req.params.id);
    if (!success) return res.status(404).json({ error: "Meeting not found" });
    res.json({ success: true });
  });

  app.post("/api/meetings/:id/ai-query", async (req: Request, res: Response) => {
    const meeting = await storage.getMeeting(req.params.id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    const parsed = aiQuerySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "A valid query is required (1-2000 characters)" });

    const { query } = parsed.data;

    try {
      const { generateCompletion } = await import("../ai/providers");

      const topicsSummary = Array.isArray(meeting.topics)
        ? (meeting.topics as any[]).map((t: any) => `- ${t.title}: ${truncateContext(t.content || "", 300)}`).join("\n")
        : "";

      const transcriptSummary = Array.isArray(meeting.transcript)
        ? truncateContext(
            (meeting.transcript as any[]).map((t: any) => `[${t.timestamp}] ${t.speaker}: ${t.text}`).join("\n"),
            3000
          )
        : "";

      const meetingContext = `Meeting: ${meeting.title}
Date: ${meeting.date}
Duration: ${meeting.duration} minutes
Summary: ${truncateContext(meeting.summary || "", 1000)}
Main Points: ${JSON.stringify(meeting.mainPoints)}
Topics:
${topicsSummary}
Transcript Excerpt:
${transcriptSummary}
Action Items: ${JSON.stringify(meeting.actionItems)}`;

      const responseText = await generateCompletion(
        [{ role: "user", content: `You are a legal meeting assistant. Based on the following meeting data, answer this question concisely and helpfully:\n\n${meetingContext}\n\nQuestion: ${query}` }],
        { model: "claude-sonnet-4-20250514", maxTokens: 1024, caller: "meeting_ai_query" }
      );

      res.json({ response: responseText || "No response generated." });
    } catch (error: any) {
      console.error("AI query error:", error.message);
      res.status(500).json({ error: "AI query failed. Please try again." });
    }
  });
}
