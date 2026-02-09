import { generateCompletion, AVAILABLE_MODELS, streamResponse } from "../ai/providers";

interface TestResult {
  test: string;
  provider: string;
  status: "pass" | "fail" | "skip";
  responseLength?: number;
  time?: number;
  error?: string;
}

const results: TestResult[] = [];

async function testAnthropicCompletion() {
  console.log("\n═══ TEST 1: Anthropic Claude — Legal Completion ═══");
  const start = Date.now();
  try {
    const result = await generateCompletion(
      [{ role: "user", content: "Under Utah Code Section 30-3-10, what factors does the court consider in determining the best interests of the child in a custody dispute? List 3 key factors briefly." }],
      {
        model: "claude-sonnet-4-5",
        maxTokens: 512,
        system: "You are a Utah legal research assistant. Provide concise, accurate legal information with statute citations.",
        caller: "test_anthropic",
      }
    );
    const time = Date.now() - start;
    console.log(`  Response (${result.length} chars, ${time}ms):`);
    console.log(`  ${result.slice(0, 300)}...`);
    results.push({ test: "Anthropic Completion", provider: "anthropic", status: "pass", responseLength: result.length, time });
  } catch (e: any) {
    const time = Date.now() - start;
    console.error(`  ERROR: ${e.message}`);
    results.push({ test: "Anthropic Completion", provider: "anthropic", status: "fail", time, error: e.message });
  }
}

async function testAnthropicStream() {
  console.log("\n═══ TEST 2: Anthropic Claude — Streaming ═══");
  const start = Date.now();
  try {
    let fullResponse = "";
    let chunkCount = 0;
    const stream = streamResponse(
      [{ role: "user", content: "Draft a 2-sentence summary of what constitutes a 'material change in circumstances' for custody modification in Utah." }],
      {
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        maxTokens: 256,
      }
    );
    for await (const chunk of stream) {
      if (chunk.content) {
        fullResponse += chunk.content;
        chunkCount++;
      }
      if (chunk.done) break;
    }
    const time = Date.now() - start;
    console.log(`  Streamed ${chunkCount} chunks (${fullResponse.length} chars, ${time}ms)`);
    console.log(`  ${fullResponse.slice(0, 200)}...`);
    results.push({ test: "Anthropic Streaming", provider: "anthropic", status: "pass", responseLength: fullResponse.length, time });
  } catch (e: any) {
    const time = Date.now() - start;
    console.error(`  ERROR: ${e.message}`);
    results.push({ test: "Anthropic Streaming", provider: "anthropic", status: "fail", time, error: e.message });
  }
}

async function testGeminiCompletion() {
  console.log("\n═══ TEST 3: Google Gemini — Legal Completion ═══");
  const geminiAvailable = AVAILABLE_MODELS.find(m => m.provider === "gemini")?.available;
  if (!geminiAvailable) {
    console.log("  SKIP: Gemini not configured");
    results.push({ test: "Gemini Completion", provider: "gemini", status: "skip", error: "Not configured" });
    return;
  }
  const start = Date.now();
  try {
    const result = await generateCompletion(
      [{ role: "user", content: "What is the statute of limitations for construction defect claims in Utah? Cite the specific Utah Code section." }],
      {
        model: "gemini-2.5-flash",
        maxTokens: 512,
        system: "You are a Utah legal research assistant. Provide concise legal information.",
        caller: "test_gemini",
      }
    );
    const time = Date.now() - start;
    console.log(`  Response (${result.length} chars, ${time}ms):`);
    console.log(`  ${result.slice(0, 300)}...`);
    results.push({ test: "Gemini Completion", provider: "gemini", status: "pass", responseLength: result.length, time });
  } catch (e: any) {
    const time = Date.now() - start;
    console.error(`  ERROR: ${e.message}`);
    results.push({ test: "Gemini Completion", provider: "gemini", status: "fail", time, error: e.message });
  }
}

async function testGeminiStream() {
  console.log("\n═══ TEST 4: Google Gemini — Streaming ═══");
  const geminiAvailable = AVAILABLE_MODELS.find(m => m.provider === "gemini")?.available;
  if (!geminiAvailable) {
    console.log("  SKIP: Gemini not configured");
    results.push({ test: "Gemini Streaming", provider: "gemini", status: "skip", error: "Not configured" });
    return;
  }
  const start = Date.now();
  try {
    let fullResponse = "";
    let chunkCount = 0;
    const stream = streamResponse(
      [{ role: "user", content: "Briefly explain the discovery rule as applied to medical malpractice claims in Utah." }],
      {
        provider: "gemini",
        model: "gemini-2.5-flash",
        maxTokens: 256,
      }
    );
    for await (const chunk of stream) {
      if (chunk.content) {
        fullResponse += chunk.content;
        chunkCount++;
      }
      if (chunk.done) break;
    }
    const time = Date.now() - start;
    console.log(`  Streamed ${chunkCount} chunks (${fullResponse.length} chars, ${time}ms)`);
    console.log(`  ${fullResponse.slice(0, 200)}...`);
    results.push({ test: "Gemini Streaming", provider: "gemini", status: "pass", responseLength: fullResponse.length, time });
  } catch (e: any) {
    const time = Date.now() - start;
    console.error(`  ERROR: ${e.message}`);
    results.push({ test: "Gemini Streaming", provider: "gemini", status: "fail", time, error: e.message });
  }
}

async function testLegalResearchPrompt() {
  console.log("\n═══ TEST 5: Legal Research Pipeline — Plan Generation ═══");
  const start = Date.now();
  try {
    const planText = await generateCompletion(
      [{ role: "user", content: "What are the requirements for modifying a custody order in Utah when one parent relocates?" }],
      {
        model: "claude-sonnet-4-5",
        maxTokens: 1024,
        system: `You are a legal research planner for a Utah law firm (Synergy Law PLLC). Given a legal research query, break it down into exactly 5 discrete research steps. Each step should be a specific, actionable research task.

Return ONLY a JSON array of 5 strings, each being a research step title. No other text.
Example: ["Search Utah Code Title 76 for relevant criminal statutes", "Review Utah Rules of Civil Procedure for applicable procedural requirements", "Check Utah State Bar ethics opinions on the topic", "Survey recent Utah appellate decisions and case law", "Compile findings into organized legal summary with citations"]`,
        caller: "test_legal_research_plan",
      }
    );
    const time = Date.now() - start;
    let steps: string[];
    try {
      steps = JSON.parse(planText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      steps = [];
    }
    console.log(`  Generated ${steps.length} research steps (${time}ms):`);
    steps.forEach((s, i) => console.log(`    ${i + 1}. ${s}`));
    results.push({ test: "Legal Research Plan", provider: "anthropic", status: steps.length === 5 ? "pass" : "fail", time, responseLength: planText.length });
  } catch (e: any) {
    const time = Date.now() - start;
    console.error(`  ERROR: ${e.message}`);
    results.push({ test: "Legal Research Plan", provider: "anthropic", status: "fail", time, error: e.message });
  }
}

async function testDocumentAnalysis() {
  console.log("\n═══ TEST 6: AI Document Analysis — Legal Summary ═══");
  const start = Date.now();
  const sampleDocument = `PETITION FOR MODIFICATION OF CUSTODY ORDER
Case No. 2024-FC-001234
Third District Court, Salt Lake County, State of Utah

Petitioner MARK WILSON respectfully petitions this Court for modification of the existing custody order entered on March 15, 2023, and states as follows:

1. The parties were divorced by Decree of Divorce entered March 15, 2023.
2. The current custody order awards primary physical custody to Respondent MARGARET WILSON.
3. Since entry of the Decree, there has been a material change in circumstances, specifically:
   a) Petitioner has relocated to Park City, Utah for employment opportunities.
   b) The minor children, EMMA WILSON (DOB: 03/14/2014) and NOAH WILSON (DOB: 06/22/2017), have expressed interest in spending more time with Petitioner.
4. Petitioner seeks modification to a joint physical custody arrangement with equal time-sharing.`;

  try {
    const result = await generateCompletion(
      [{ role: "user", content: `Analyze this legal document and provide: 1) Document type, 2) Key parties, 3) Core legal issues, 4) Recommended next steps for the responding party.\n\n${sampleDocument}` }],
      {
        model: "claude-sonnet-4-5",
        maxTokens: 1024,
        system: "You are a legal document analyst at Synergy Law PLLC in Utah. Provide thorough, actionable analysis.",
        caller: "test_document_analysis",
      }
    );
    const time = Date.now() - start;
    console.log(`  Response (${result.length} chars, ${time}ms):`);
    console.log(`  ${result.slice(0, 400)}...`);
    results.push({ test: "Document Analysis", provider: "anthropic", status: "pass", responseLength: result.length, time });
  } catch (e: any) {
    const time = Date.now() - start;
    console.error(`  ERROR: ${e.message}`);
    results.push({ test: "Document Analysis", provider: "anthropic", status: "fail", time, error: e.message });
  }
}

async function testMatterContextChat() {
  console.log("\n═══ TEST 7: Matter-Context AI Chat ═══");
  const start = Date.now();
  try {
    const result = await generateCompletion(
      [
        { role: "user", content: "I'm working on the Wilson v. Wilson custody modification case. The father relocated to Park City and is seeking 50/50 custody. Our client (the mother) opposes. The children are 12 and 9. What are our strongest arguments?" },
        { role: "assistant", content: "Based on the case details, here are key arguments for opposing the custody modification:\n\n1. **Stability of Current Arrangement**: The children have been thriving under the current custody arrangement with strong school performance and social connections.\n\n2. **Father's Relocation Impact**: Park City is 30+ miles from the children's school, making daily commuting impractical for a 50/50 arrangement.\n\n3. **Inconsistent Visitation History**: If the father has not consistently exercised his current visitation, this undermines his claim for increased time.\n\n4. **Children's Best Interests under Utah Code § 30-3-10**: The court considers the child's established community ties, school continuity, and quality of each parent's relationship." },
        { role: "user", content: "What specific Utah case law supports our position on the relocation issue?" },
      ],
      {
        model: "claude-sonnet-4-5",
        maxTokens: 1024,
        system: "You are VeriBot, the AI legal assistant for Synergy Law PLLC. You help attorneys with case strategy, legal research, and document analysis. Always cite Utah law specifically.",
        caller: "test_matter_context_chat",
      }
    );
    const time = Date.now() - start;
    console.log(`  Response (${result.length} chars, ${time}ms):`);
    console.log(`  ${result.slice(0, 400)}...`);
    results.push({ test: "Matter Context Chat", provider: "anthropic", status: "pass", responseLength: result.length, time });
  } catch (e: any) {
    const time = Date.now() - start;
    console.error(`  ERROR: ${e.message}`);
    results.push({ test: "Matter Context Chat", provider: "anthropic", status: "fail", time, error: e.message });
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  VERICASE — AI Tools Integration Test               ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nTimestamp: ${new Date().toISOString()}`);
  console.log(`\nAvailable AI Models:`);
  AVAILABLE_MODELS.forEach(m => {
    console.log(`  ${m.available ? "✓" : "✗"} ${m.name} (${m.provider})`);
  });

  await testAnthropicCompletion();
  await testAnthropicStream();
  await testGeminiCompletion();
  await testGeminiStream();
  await testLegalResearchPrompt();
  await testDocumentAnalysis();
  await testMatterContextChat();

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║                 AI TEST SUMMARY                     ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  const pass = results.filter(r => r.status === "pass").length;
  const fail = results.filter(r => r.status === "fail").length;
  const skip = results.filter(r => r.status === "skip").length;
  console.log(`  Total: ${results.length} | Pass: ${pass} | Fail: ${fail} | Skip: ${skip}`);
  console.log("");
  results.forEach(r => {
    const icon = r.status === "pass" ? "✓" : r.status === "fail" ? "✗" : "○";
    console.log(`  ${icon} ${r.test} (${r.provider}) — ${r.status}${r.time ? ` ${r.time}ms` : ""}${r.responseLength ? ` [${r.responseLength} chars]` : ""}${r.error ? ` ERROR: ${r.error}` : ""}`);
  });
  console.log("");
}

main();
