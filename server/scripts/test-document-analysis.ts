import fs from "fs";
import path from "path";
import { db } from "../db";
import { clients, matters } from "@shared/models/tables";
import { eq } from "drizzle-orm";
import { handleFileUpload } from "../services/ingestion-pipeline";
import { insightsStorage } from "../services/insights-storage";
import { runInsightAnalysis } from "../services/insights-analysis";

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function printSection(title: string) {
  console.log("\n" + "=".repeat(70));
  console.log(`  ${title}`);
  console.log("=".repeat(70));
}

function printSubSection(title: string) {
  console.log(`\n--- ${title} ---`);
}

async function run() {
  printSection("VERICASE Document Analysis Test");
  console.log("Testing: Text extraction, tone analysis, cross-document consistency (H0 vs H1)");

  printSection("STEP 1: Create Test Client & Matter");

  let [client] = await db.select().from(clients)
    .where(eq(clients.name, "Martinez v. Wheeler Test Case")).limit(1);

  if (!client) {
    [client] = await db.insert(clients).values({
      name: "Martinez v. Wheeler Test Case",
      email: "test-analysis@synergy.law",
    }).returning();
    console.log(`  Client created: ${client.id}`);
  } else {
    console.log(`  Client exists: ${client.id}`);
  }

  let [matter] = await db.select().from(matters)
    .where(eq(matters.name, "Document Analysis Test — Tone & Consistency")).limit(1);

  if (!matter) {
    [matter] = await db.insert(matters).values({
      clientId: client.id,
      name: "Document Analysis Test — Tone & Consistency",
      description: "Testing text extraction, tone analysis, and null/alternative hypothesis consistency",
      status: "active",
      matterType: "personal-injury",
      practiceArea: "personal-injury",
      openedDate: new Date().toISOString().split("T")[0],
    }).returning();
    console.log(`  Matter created: ${matter.id}`);
  } else {
    console.log(`  Matter exists: ${matter.id}`);
  }

  printSection("STEP 2: Upload Test Documents");
  const docDir = path.resolve("test-documents");
  const testFiles = [
    { name: "witness-statement-plaintiff.txt", path: path.join(docDir, "witness-statement-plaintiff.txt") },
    { name: "witness-statement-defendant.txt", path: path.join(docDir, "witness-statement-defendant.txt") },
    { name: "police-report-excerpt.txt", path: path.join(docDir, "police-report-excerpt.txt") },
  ];

  const existingAssets = await insightsStorage.getMatterAssets(matter.id);
  const existingNames = existingAssets.map((a: any) => a.originalFilename);

  const uploadedAssets: any[] = [];
  for (const file of testFiles) {
    if (existingNames.includes(file.name)) {
      console.log(`  Already uploaded: ${file.name}`);
      uploadedAssets.push(existingAssets.find((a: any) => a.originalFilename === file.name));
      continue;
    }

    if (!fs.existsSync(file.path)) {
      throw new Error(`Test document not found: ${file.path}`);
    }

    const tmpPath = path.join("/tmp", `test-${Date.now()}-${file.name}`);
    fs.copyFileSync(file.path, tmpPath);

    const asset = await handleFileUpload(matter.id, {
      originalname: file.name,
      path: tmpPath,
      size: fs.statSync(file.path).size,
      mimetype: "text/plain",
    }, "test-user");

    uploadedAssets.push(asset);
    console.log(`  Uploaded: ${file.name} (${asset.fileType}, hash: ${asset.hashSha256?.substring(0, 16)}...)`);
  }

  printSection("STEP 3: Wait for Text Extraction");
  const maxWait = 60000;
  const start = Date.now();
  let allReady = false;

  while (Date.now() - start < maxWait) {
    const assets = await insightsStorage.getMatterAssets(matter.id);
    const readyCount = assets.filter((a: any) => a.status === "ready").length;
    const failedCount = assets.filter((a: any) => a.status === "failed").length;
    const total = assets.length;

    process.stdout.write(`\r  Processing: ${readyCount}/${total} ready, ${failedCount} failed...`);

    if (readyCount + failedCount >= testFiles.length) {
      allReady = failedCount === 0;
      console.log(allReady ? " All ready!" : ` Done (${failedCount} failures)`);
      break;
    }
    await sleep(2000);
  }

  const finalAssets = await insightsStorage.getMatterAssets(matter.id);
  for (const asset of finalAssets) {
    printSubSection(asset.originalFilename);
    console.log(`    Status: ${asset.status}`);
    console.log(`    Type: ${asset.fileType}`);
    console.log(`    SHA-256: ${asset.hashSha256}`);
    if (asset.status === "failed") {
      console.log(`    ERROR: ${(asset as any).errorMessage}`);
    }
  }

  const textsWithAssets = await insightsStorage.getAssetTextsForMatter(matter.id);
  console.log(`\n  Text records extracted: ${textsWithAssets.length}`);
  for (const t of textsWithAssets) {
    console.log(`    - ${t.asset.originalFilename}: ${t.fullText?.length || 0} chars, method: ${t.method}, confidence: ${t.confidenceOverall}`);
  }

  if (textsWithAssets.length === 0) {
    console.log("\n  FATAL: No text was extracted. Cannot run analysis.");
    process.exit(1);
  }

  printSection("STEP 4: Run Tone Analysis");
  console.log("  Launching AI tone analysis across all documents...");

  const toneRun = await insightsStorage.createInsightRun({
    matterId: matter.id,
    requestedByUserId: "test-user",
    intentType: "tone_analysis",
    priorityRules: null,
    outputFormat: "executive_brief",
    scope: null,
    status: "queued",
  });
  console.log(`  Tone analysis run ID: ${toneRun.id}`);

  await runInsightAnalysis(toneRun.id);

  const toneResult = await insightsStorage.getInsightRun(toneRun.id);
  const toneOutputs = await insightsStorage.getInsightOutputs(toneRun.id);
  console.log(`  Status: ${toneResult?.status}`);
  if (toneResult?.status === "failed") {
    console.log(`  Error: ${(toneResult as any).errorMessage}`);
  }

  let toneData: any[] = [];
  const toneSection = toneOutputs.find((o: any) => o.section === "tone_analysis");
  if (toneSection) {
    toneData = toneSection.contentJson as any[];
    console.log(`\n  Analyzed ${toneData.length} document(s) for tone:`);

    for (const t of toneData) {
      printSubSection(`Tone: ${t.document}`);
      console.log(`    Overall Tone: ${t.overallTone}`);
      console.log(`    Emotional Register: ${t.emotionalRegister}`);
      console.log(`    Formality: ${t.formalityLevel}`);
      console.log(`    Persuasion Tactics: ${t.persuasionTactics?.join(", ") || "none detected"}`);
      console.log(`    Linguistic Markers: ${t.linguisticMarkers?.join(", ") || "none"}`);

      if (t.credibilityIndicators) {
        console.log(`    Credibility Indicators:`);
        console.log(`      Hedging: ${t.credibilityIndicators.hedgingLanguage?.join("; ") || "none"}`);
        console.log(`      Absolutes: ${t.credibilityIndicators.absoluteStatements?.join("; ") || "none"}`);
        console.log(`      Evasive: ${t.credibilityIndicators.evasivePatterns?.join("; ") || "none"}`);
      }

      if (t.toneShifts?.length > 0) {
        console.log(`    Tone Shifts:`);
        for (const s of t.toneShifts) {
          console.log(`      @ ${s.location}: ${s.fromTone} -> ${s.toTone} (${s.significance})`);
        }
      }
      console.log(`    Summary: ${t.summary}`);
    }
  } else {
    console.log("  No tone analysis results returned.");
  }

  printSection("STEP 5: Cross-Document Consistency Check (H0 vs H1)");
  console.log("  Launching hypothesis-based cross-referencing...");
  console.log("  H0 (Null): Documents are consistent — same facts, no material contradictions");
  console.log("  H1 (Alt):  Documents contain material inconsistencies\n");

  const consistencyRun = await insightsStorage.createInsightRun({
    matterId: matter.id,
    requestedByUserId: "test-user",
    intentType: "consistency_check",
    priorityRules: null,
    outputFormat: "executive_brief",
    scope: null,
    status: "queued",
  });
  console.log(`  Consistency check run ID: ${consistencyRun.id}`);

  await runInsightAnalysis(consistencyRun.id);

  const consistencyResult = await insightsStorage.getInsightRun(consistencyRun.id);
  const consistencyOutputs = await insightsStorage.getInsightOutputs(consistencyRun.id);
  console.log(`  Status: ${consistencyResult?.status}`);
  if (consistencyResult?.status === "failed") {
    console.log(`  Error: ${(consistencyResult as any).errorMessage}`);
  }

  let consistencyData: any[] = [];
  const consistencySection = consistencyOutputs.find((o: any) => o.section === "consistency_check");
  if (consistencySection) {
    consistencyData = consistencySection.contentJson as any[];
    console.log(`\n  Cross-referenced ${consistencyData.length} document pair(s):`);

    for (const c of consistencyData) {
      printSubSection(`${c.documentA} vs ${c.documentB}`);
      console.log(`    H0 (Null): ${c.nullHypothesis}`);
      console.log(`    H1 (Alt):  ${c.alternativeHypothesis}`);
      console.log(`    VERDICT:   ${c.verdict?.toUpperCase()} (confidence: ${((c.confidenceScore || 0) * 100).toFixed(0)}%)`);
      console.log(`    Reasoning: ${c.statisticalReasoning}`);

      if (c.factualDiscrepancies?.length > 0) {
        console.log(`\n    Factual Discrepancies (${c.factualDiscrepancies.length}):`);
        for (const d of c.factualDiscrepancies) {
          console.log(`      [${d.significance?.toUpperCase()}] ${d.claim}`);
          console.log(`        Doc A: ${d.versionA}`);
          console.log(`        Doc B: ${d.versionB}`);
        }
      }

      if (c.evidenceForNull?.length > 0) {
        console.log(`\n    Evidence Supporting Consistency (${c.evidenceForNull.length}):`);
        for (const e of c.evidenceForNull.slice(0, 3)) {
          console.log(`      + ${e.statement}`);
        }
      }

      if (c.evidenceForAlternative?.length > 0) {
        console.log(`\n    Evidence Supporting Inconsistency (${c.evidenceForAlternative.length}):`);
        for (const e of c.evidenceForAlternative.slice(0, 3)) {
          console.log(`      - ${e.statement}`);
        }
      }

      console.log(`\n    Tone Alignment: ${c.toneAlignment?.aligned ? "ALIGNED" : "MISALIGNED"} — ${c.toneAlignment?.explanation}`);
      console.log(`    Assessment: ${c.overallAssessment}`);
    }
  } else {
    console.log("  No consistency check results returned.");
  }

  printSection("TEST SUMMARY");
  const results: Array<[string, boolean]> = [
    ["Documents uploaded successfully", uploadedAssets.length === 3],
    ["Text extraction completed", allReady],
    ["Text content extracted for all docs", textsWithAssets.length >= 3],
    ["Tone analysis returned results", toneData.length > 0],
    ["Consistency check returned results", consistencyData.length > 0],
    ["Detected different tones across documents",
      toneData.length > 1 && toneData.some((t: any) => t.overallTone !== toneData[0]?.overallTone)],
    ["Detected cross-document inconsistencies",
      consistencyData.some((c: any) => c.verdict === "inconsistent")],
    ["Identified specific factual discrepancies",
      consistencyData.some((c: any) => c.factualDiscrepancies?.length > 0)],
  ];

  for (const [label, ok] of results) {
    console.log(`  ${ok ? "PASS" : "FAIL"}: ${label}`);
  }

  const passed = results.filter(([, ok]) => ok).length;
  console.log(`\n  Result: ${passed}/${results.length} checks passed`);
  console.log(`  Matter ID: ${matter.id} (view in UI at /matters/${matter.id})`);
  console.log("=".repeat(70));

  process.exit(passed === results.length ? 0 : 1);
}

run().catch((err) => {
  console.error("\nFATAL ERROR:", err.message);
  console.error(err.stack);
  process.exit(1);
});
