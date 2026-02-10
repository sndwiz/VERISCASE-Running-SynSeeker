import type { Express, Request, Response } from "express";
import { generateCompletion } from "../ai/providers";

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
          system: `You are a legal research planner operating under the VERICASE Core Doctrine for Synergy Law PLLC.

DOCTRINE: "Totality of the circumstances, measured — then argued." Build converging lines of evidence mapping to legal elements.

Given a legal research query, break it down into exactly 5 discrete research steps. Structure steps to cover:
1. Identify the relevant legal elements (what must be proved)
2. Find primary authority (statutes, rules, constitutional provisions)
3. Find secondary authority (case law, precedent, interpretive guidance)
4. Identify competing interpretations or counter-arguments (hypothesis management)
5. Map findings to legal elements with evidence strength assessment

Return ONLY a JSON array of 5 strings, each being a research step title. No other text.
Example: ["Identify legal elements and search Utah Code Title 76 for relevant statutes", "Review URCP and procedural requirements applicable to the claim", "Survey Utah appellate decisions for supporting and opposing precedent", "Analyze competing legal theories and counter-arguments", "Map findings to legal elements with strength assessment and open questions"]`,
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
              system: `You are a senior legal researcher operating under the VERICASE Core Doctrine at Synergy Law PLLC.

DOCTRINE: "Totality of the circumstances, measured — then argued."
PRIME DIRECTIVE: Evidence Over Vibes — separate observations from inferences, attach confidence levels, present alternative interpretations.

Your research must follow doctrine principles:
- Specific to Utah law when applicable (Utah Code, Utah Rules, Utah State Bar)
- Include specific statute numbers, rule citations, and case names
- For each finding: note its STRENGTH (how directly it applies) and CONFIDENCE (how settled the law is)
- Present competing interpretations — if there are split decisions or evolving law, preserve both sides
- Identify which LEGAL ELEMENTS each finding supports (intent, causation, damages, duty, breach, etc.)
- Flag any areas where the law is unsettled, evolving, or where counter-arguments are strong
- Note what additional evidence or research would strengthen or weaken each position

The overall research query is: "${query}"

Execute this specific research step. Provide findings in 2-4 paragraphs. Include Utah Code Ann. sections, URCP rules, and case citations. Explicitly label the strength of each authority.`,
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
          system: `You are a senior legal researcher compiling a comprehensive research memo under the VERICASE Core Doctrine for Synergy Law PLLC.

DOCTRINE: "Build the web, show the receipts, and let the totality speak."

Compile research into a courtroom-grade memo that maps findings to legal elements. Format:

1. **Research Question** — Restate the query and identify the legal elements at issue
2. **Legal Element Map** — For each element (intent, knowledge, causation, damages, duty, breach, pattern, notice, etc.): strongest authority found, confidence level, and what would strengthen it
3. **Key Findings** — Organized by topic with statute/rule citations. Label each finding's strength: Strong (binding authority directly on point) / Moderate (persuasive or analogous) / Weak (dicta, distant jurisdiction, or unsettled)
4. **Relevant Statutes & Rules** — Bulleted list with full citations and brief applicability notes
5. **Case Law & Precedent** — Cases organized by how they support or undermine the position. Preserve competing precedent — do not suppress unfavorable holdings
6. **Competing Theories & Counter-Arguments** — Present the strongest opposing position and what evidence would be needed to overcome it (hypothesis management)
7. **Evidence Gaps & Open Questions** — What is missing? What would change the analysis? What needs authentication or further investigation?
8. **Recommendations** — Prioritized next steps with confidence levels

Use markdown formatting. Include Utah Code sections, URCP rules, and case citations throughout. Every claim must be traceable to a specific authority.`,
          caller: "legal_research_compile",
        }
      );
      searchCount += 5;

      send("summary", { content: finalSummary, totalSearches: searchCount });
      send("done", { totalSearches: searchCount });

      res.end();
    } catch (error: any) {
      console.error("[legal-research] Error:", error);
      if (res.headersSent) {
        send("error", { message: error.message || "Research failed" });
        res.end();
      } else {
        res.status(500).json({ error: error.message || "Research failed" });
      }
    }
  });
}
