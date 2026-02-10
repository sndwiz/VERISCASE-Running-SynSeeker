import { insightsStorage } from "../services/insights-storage";
import { runInsightAnalysis } from "../services/insights-analysis";
import { db } from "../db";
import { matters } from "@shared/models/tables";
import { eq } from "drizzle-orm";

async function run() {
  const [matter] = await db.select().from(matters)
    .where(eq(matters.name, "Document Analysis Test — Tone & Consistency")).limit(1);
  if (!matter) { console.log("Matter not found"); process.exit(1); }

  const existingRuns = await insightsStorage.getInsightRuns(matter.id);
  const completedConsistency = existingRuns.find((r: any) => r.intentType === "consistency_check" && r.status === "completed");
  
  let runId: string;
  if (completedConsistency) {
    console.log("Found completed consistency run:", completedConsistency.id);
    runId = completedConsistency.id;
  } else {
    const run = await insightsStorage.createInsightRun({
      matterId: matter.id,
      requestedByUserId: "test-user",
      intentType: "consistency_check",
      priorityRules: null,
      outputFormat: "executive_brief",
      scope: null,
      status: "queued",
    });
    runId = run.id;
    console.log("Created new consistency run:", runId);
    await runInsightAnalysis(runId);
  }

  const result = await insightsStorage.getInsightRun(runId);
  const outputs = await insightsStorage.getInsightOutputs(runId);
  console.log("Status:", result?.status);
  if (result?.status === "failed") {
    console.log("Error:", (result as any).errorMessage);
    process.exit(1);
  }

  const section = outputs.find((o: any) => o.section === "consistency_check");
  if (section) {
    const data = section.contentJson as any[];
    console.log("\nCross-referenced", data.length, "document pair(s):\n");
    for (const c of data) {
      console.log("===", c.documentA, "vs", c.documentB, "===");
      console.log("H0:", c.nullHypothesis);
      console.log("H1:", c.alternativeHypothesis);
      console.log("VERDICT:", c.verdict?.toUpperCase(), "(confidence:", ((c.confidenceScore || 0) * 100).toFixed(0) + "%)");
      console.log("Reasoning:", c.statisticalReasoning);
      if (c.factualDiscrepancies?.length > 0) {
        console.log("\nFactual Discrepancies (" + c.factualDiscrepancies.length + "):");
        for (const d of c.factualDiscrepancies) {
          console.log("  [" + d.significance?.toUpperCase() + "]", d.claim);
          console.log("    Doc A:", d.versionA);
          console.log("    Doc B:", d.versionB);
        }
      }
      if (c.toneAlignment) {
        console.log("\nTone:", c.toneAlignment.aligned ? "ALIGNED" : "MISALIGNED", "—", c.toneAlignment.explanation);
      }
      console.log("\nAssessment:", c.overallAssessment, "\n");
    }
  } else {
    console.log("No consistency results found");
  }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
