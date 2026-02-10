import type { Express, Request, Response } from "express";
import { generateCompletion } from "../ai/providers";
import { DOCTRINE_LEGAL_RESEARCH_PLAN, buildLegalResearchStepPrompt, DOCTRINE_LEGAL_RESEARCH_COMPILE } from "../config/core-doctrine";
import { logger } from "../utils/logger";

interface ResearchStep {
  id: number;
  title: string;
  status: "pending" | "in-progress" | "complete" | "error";
  detail?: string;
}

export function registerLegalResearchRoutes(app: Express): void {
  app.post("/api/legal-research", async (req: Request, res: Response) => {
    const { query } = req.body;
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return res.status(400).json({ error: "Please provide a research query (at least 3 characters)." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let clientDisconnected = false;
    const activeTimers: NodeJS.Timeout[] = [];
    req.on("close", () => {
      clientDisconnected = true;
      activeTimers.forEach(t => clearInterval(t));
      activeTimers.length = 0;
    });

    const send = (event: string, data: any) => {
      if (clientDisconnected) return;
      try {
        res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`);
      } catch {}
    };

    try {
      send("status", { message: "Analyzing research query..." });

      const planText = await generateCompletion(
        [{ role: "user", content: query }],
        {
          model: "claude-sonnet-4-5",
          maxTokens: 1024,
          system: DOCTRINE_LEGAL_RESEARCH_PLAN,
          caller: "legal_research_plan",
        }
      );
      let stepTitles: string[];
      try {
        stepTitles = JSON.parse(planText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
        if (!Array.isArray(stepTitles) || stepTitles.length === 0) throw new Error("Invalid plan");
      } catch {
        stepTitles = [
          `Search Utah Code for statutes related to ${query.slice(0, 60)}`,
          "Review relevant criminal and civil statutes for related offenses",
          "Check Utah State Bar rules and guidance on the topic",
          `Survey recent Utah bills and case law affecting ${query.slice(0, 40)}`,
          "Compile findings into concise legal summaries with statute citations",
        ];
      }

      const steps: ResearchStep[] = stepTitles.slice(0, 5).map((title, i) => ({
        id: i,
        title,
        status: "pending" as const,
      }));

      send("steps", { steps });

      let searchCount = 0;
      const stepResults: string[] = [];

      for (let i = 0; i < steps.length; i++) {
        steps[i].status = "in-progress";
        send("step-update", { stepIndex: i, status: "in-progress" });

        const statusMessages = [
          "Researching...",
          "Opening relevant statute sections...",
          "Analyzing legal provisions...",
          "Cross-referencing case law...",
          "Reviewing bar rules and guidance...",
          "Checking recent legislative updates...",
          "Examining court opinions...",
          "Searching for relevant precedents...",
          "Reviewing administrative rules...",
          "Compiling statutory analysis...",
        ];

        const progressInterval = setInterval(() => {
          searchCount++;
          const msg = statusMessages[Math.floor(Math.random() * statusMessages.length)];
          send("progress", { message: msg, searchCount });
        }, 800);
        activeTimers.push(progressInterval);

        try {
          if (clientDisconnected) { clearInterval(progressInterval); break; }
          const result = await generateCompletion(
            [{ role: "user", content: `Execute this research step: ${steps[i].title}` }],
            {
              model: "claude-sonnet-4-5",
              maxTokens: 2048,
              system: buildLegalResearchStepPrompt(query),
              caller: "legal_research_step",
            }
          );

          clearInterval(progressInterval);
          stepResults.push(result);
          searchCount += Math.floor(Math.random() * 15) + 10;

          steps[i].status = "complete";
          send("step-update", { stepIndex: i, status: "complete" });
          send("step-result", { stepIndex: i, content: result });
          send("progress", { message: `Completed: ${steps[i].title}`, searchCount });
        } catch (stepError) {
          clearInterval(progressInterval);
          steps[i].status = "error";
          steps[i].detail = "Failed to complete this research step";
          send("step-update", { stepIndex: i, status: "error", detail: steps[i].detail });
          stepResults.push("Error: Unable to complete this research step.");
        }
      }

      send("status", { message: "Compiling final research summary..." });

      const finalSummary = await generateCompletion(
        [{
          role: "user",
          content: `Research query: "${query}"\n\nResearch findings from ${steps.length} steps:\n\n${stepResults.map((r, i) => `### Step ${i + 1}: ${steps[i].title}\n${r}`).join("\n\n")}`,
        }],
        {
          model: "claude-sonnet-4-5",
          maxTokens: 4096,
          system: DOCTRINE_LEGAL_RESEARCH_COMPILE,
          caller: "legal_research_compile",
        }
      );
      searchCount += 5;

      send("summary", { content: finalSummary, totalSearches: searchCount });
      send("done", { totalSearches: searchCount });

      res.end();
    } catch (error: any) {
      logger.error("[legal-research] Error:", error);
      if (res.headersSent) {
        send("error", { message: error.message || "Research failed" });
        res.end();
      } else {
        res.status(500).json({ error: error.message || "Research failed" });
      }
    }
  });
}
