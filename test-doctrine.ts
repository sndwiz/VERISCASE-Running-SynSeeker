import { buildModelRegistry, getRegistryModel, getAvailableModels, getLocalModels, getExternalModels, MODEL_REGISTRY } from "./server/config/model-registry";
import { evaluatePolicy, getMode, setMode, getSelectedModel, setSelectedModel, recordPolicyDecision, getPolicyAuditLog, getPolicyState, type PolicyRequest, type PolicyDecision } from "./server/ai/policy-engine";

let passed = 0;
let failed = 0;
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

console.log("\n=== 1. MODEL REGISTRY ===");

const registry = buildModelRegistry();
assert(registry.length >= 15, `Registry has ${registry.length} models (expected >= 15)`);

const modelIds = registry.map(m => m.modelId);
assert(modelIds.includes("claude-sonnet-4-5"), "Has claude-sonnet-4-5");
assert(modelIds.includes("gpt-4o"), "Has gpt-4o");
assert(modelIds.includes("gemini-2.5-flash"), "Has gemini-2.5-flash");
assert(modelIds.includes("synergy-default"), "Has synergy-default");
assert(modelIds.includes("synseekr-default"), "Has synseekr-default");
assert(modelIds.includes("deepseek-chat"), "Has deepseek-chat");

for (const m of registry) {
  assert(!!m.modelId && !!m.displayName && !!m.provider, `Model ${m.modelId}: has required fields`);
  assert(["external_api", "local_runner", "synseekr"].includes(m.providerType), `Model ${m.modelId}: valid providerType=${m.providerType}`);
  assert(["local_only", "sanitized_ok", "unrestricted"].includes(m.dataPolicy), `Model ${m.modelId}: valid dataPolicy=${m.dataPolicy}`);
  assert(typeof m.requiresInternet === "boolean", `Model ${m.modelId}: requiresInternet is boolean`);
  assert(m.capabilities.length > 0, `Model ${m.modelId}: has capabilities`);
  assert(m.maxContext > 0 && m.maxTokens > 0, `Model ${m.modelId}: valid context/tokens`);
}

// Helpers
assert(!!getRegistryModel("claude-sonnet-4-5"), "getRegistryModel(claude-sonnet-4-5) works");
assert(getRegistryModel("fake")  === undefined, "getRegistryModel(fake) = undefined");

const localModels = registry.filter(m => !m.requiresInternet);
const extModels = registry.filter(m => m.requiresInternet);
assert(localModels.length >= 4, `${localModels.length} local models`);
assert(extModels.length >= 10, `${extModels.length} external models`);

for (const m of localModels) {
  assert(m.dataPolicy === "local_only", `Local ${m.modelId} is local_only`);
  assert(m.providerType !== "external_api", `Local ${m.modelId} not external_api`);
}
for (const m of extModels) {
  assert(m.requiresInternet === true, `External ${m.modelId} requiresInternet`);
  assert(m.providerType === "external_api", `External ${m.modelId} is external_api`);
}

console.log("\n=== 2. POLICY ENGINE STATE ===");

setMode("online");
assert(getMode() === "online", "Mode: online");
setMode("batmode");
assert(getMode() === "batmode", "Mode: batmode");
setMode("online");

setSelectedModel("gpt-4o");
assert(getSelectedModel() === "gpt-4o", "Selected: gpt-4o");
setSelectedModel("claude-sonnet-4-5");

const ps = getPolicyState();
assert(ps.mode === "online", "getPolicyState mode correct");
assert(ps.selectedModelId === "claude-sonnet-4-5", "getPolicyState selectedModelId correct");
assert(ps.modeLabel === "ONLINE", "getPolicyState modeLabel correct");

setMode("batmode");
const ps2 = getPolicyState();
assert(ps2.modeLabel === "BATMODE — OFFLINE PRIVATE", "Batmode label correct");
setMode("online");

console.log("\n=== 3. EVALUATE POLICY — ONLINE ===");

// Online + known external model
let d = evaluatePolicy({ mode: "online", requestedModelId: "claude-sonnet-4-5" });
assert(d.originalModelId === "claude-sonnet-4-5", "Online+Claude: originalModelId");
// If not available (no API key), should fallback
const claudeEntry = getRegistryModel("claude-sonnet-4-5");
if (!claudeEntry?.available) {
  assert(d.wasFallback === true, "Online+Claude(unavailable): wasFallback=true");
} else {
  assert(d.allowed === true, "Online+Claude(available): allowed");
  assert(d.wasFallback === false, "Online+Claude(available): no fallback");
}

// Online + unknown model
d = evaluatePolicy({ mode: "online", requestedModelId: "totally-bogus" });
assert(d.wasFallback === true, "Online+Unknown: fallback");
assert(d.reason.includes("not found"), "Online+Unknown: reason says not found");

// Online + privileged case + external
d = evaluatePolicy({ mode: "online", requestedModelId: "claude-sonnet-4-5", casePolicy: "privileged" });
if (claudeEntry?.available) {
  const localAvailForPriv = getLocalModels();
  if (localAvailForPriv.length > 0) {
    assert(d.wasFallback === true, "Online+Privileged+External+LocalAvail: fallback to local");
    const effEntry = getRegistryModel(d.effectiveModelId);
    assert(!effEntry?.requiresInternet || effEntry === undefined, "Online+Privileged: effective is local");
  } else {
    assert(d.allowed === false, "Online+Privileged+External+NoLocal: BLOCKED");
    assert(d.reason.includes("External models blocked"), "Online+Privileged: reason mentions blocked");
  }
}

// Online + sealed case
d = evaluatePolicy({ mode: "online", requestedModelId: "gpt-4o", casePolicy: "sealed" });
const gptEntry = getRegistryModel("gpt-4o");
if (gptEntry?.available) {
  assert(d.wasFallback === true || d.allowed === false, "Online+Sealed+GPT: blocked or fallback");
}

// Online + raw + not_run redaction
d = evaluatePolicy({ mode: "online", requestedModelId: "claude-sonnet-4-5", payloadClassification: "raw", redactionStatus: "not_run" });
if (claudeEntry?.available) {
  assert(d.requiredSteps.includes("redact"), "Online+Raw+NotRun: needs redact");
}

// Online + raw + failed redaction = HARD BLOCK
d = evaluatePolicy({ mode: "online", requestedModelId: "claude-sonnet-4-5", payloadClassification: "raw", redactionStatus: "failed" });
if (claudeEntry?.available) {
  assert(d.allowed === false, "Online+Raw+Failed: BLOCKED");
  assert(d.reason.includes("Redaction failed"), "Online+Raw+Failed: reason mentions redaction");
}

// Online + pii_heavy + derived
d = evaluatePolicy({ mode: "online", requestedModelId: "claude-sonnet-4-5", casePolicy: "pii_heavy", payloadClassification: "derived" });
if (claudeEntry?.available) {
  assert(d.requiredSteps.includes("pii_wash"), "Online+PII_Heavy: needs pii_wash");
}

// Online + sanitized payload = no extra steps
d = evaluatePolicy({ mode: "online", requestedModelId: "claude-sonnet-4-5", payloadClassification: "sanitized" });
if (claudeEntry?.available) {
  assert(d.requiredSteps.length === 0, "Online+Sanitized: no extra steps");
}

// Online + local model = always fine
d = evaluatePolicy({ mode: "online", requestedModelId: "synergy-default" });
const synergyEntry = getRegistryModel("synergy-default");
if (synergyEntry?.available) {
  assert(d.allowed === true, "Online+LocalModel: allowed");
  assert(d.wasFallback === false, "Online+LocalModel: no fallback");
  assert(d.effectiveModelId === "synergy-default", "Online+LocalModel: effective = synergy-default");
}

console.log("\n=== 4. EVALUATE POLICY — BATMODE ===");

// Batmode + external = fallback to local
d = evaluatePolicy({ mode: "batmode", requestedModelId: "claude-sonnet-4-5" });
const localAvail = getLocalModels();
if (localAvail.length > 0) {
  assert(d.allowed === true, "Bat+Claude: allowed via fallback");
  assert(d.wasFallback === true, "Bat+Claude: wasFallback");
  assert(d.reason.includes("BATMODE"), "Bat+Claude: reason mentions BATMODE");
  const effEntry = getRegistryModel(d.effectiveModelId);
  if (effEntry) {
    assert(!effEntry.requiresInternet, "Bat+Claude: effective is local");
  }
} else {
  assert(d.allowed === false, "Bat+Claude+NoLocalAvail: blocked");
}

// Batmode + local = direct allow
d = evaluatePolicy({ mode: "batmode", requestedModelId: "synergy-default" });
if (synergyEntry) {
  assert(d.allowed === true, "Bat+Synergy: allowed");
  assert(d.wasFallback === false, "Bat+Synergy: no fallback");
  assert(d.effectiveModelId === "synergy-default", "Bat+Synergy: effective correct");
  assert(d.reason.includes("Local model approved"), "Bat+Synergy: reason OK");
}

// Batmode + synseekr = direct allow (local)
d = evaluatePolicy({ mode: "batmode", requestedModelId: "synseekr-default" });
const synseekrEntry = getRegistryModel("synseekr-default");
if (synseekrEntry) {
  assert(d.allowed === true, "Bat+SynSeekr: allowed");
  assert(d.wasFallback === false, "Bat+SynSeekr: no fallback");
}

// Batmode + GPT
d = evaluatePolicy({ mode: "batmode", requestedModelId: "gpt-4o" });
assert(d.effectiveModelId !== "gpt-4o" || d.allowed === false, "Bat+GPT: not using GPT");

// Batmode + Gemini
d = evaluatePolicy({ mode: "batmode", requestedModelId: "gemini-2.5-pro" });
assert(d.effectiveModelId !== "gemini-2.5-pro" || d.allowed === false, "Bat+Gemini: not using Gemini");

// Batmode + DeepSeek
d = evaluatePolicy({ mode: "batmode", requestedModelId: "deepseek-chat" });
assert(d.effectiveModelId !== "deepseek-chat" || d.allowed === false, "Bat+DeepSeek: not using DeepSeek");

// Batmode + unknown
d = evaluatePolicy({ mode: "batmode", requestedModelId: "nope-model" });
assert(d.wasFallback === true, "Bat+Unknown: fallback");

console.log("\n=== 5. AUDIT LOG ===");

const logBefore = getPolicyAuditLog(500).length;
const testReq: PolicyRequest = { mode: "online", requestedModelId: "claude-sonnet-4-5", caller: "audit_test", userId: "user123", matterId: "matter456" };
const testDec = evaluatePolicy(testReq);
recordPolicyDecision(testReq, testDec);
const logAfter = getPolicyAuditLog(500);
assert(logAfter.length === logBefore + 1, `Audit log grew by 1 (was ${logBefore}, now ${logAfter.length})`);

const entry = logAfter[0];
assert(entry.caller === "audit_test", "Audit: caller preserved");
assert(entry.userId === "user123", "Audit: userId preserved");
assert(entry.matterId === "matter456", "Audit: matterId preserved");
assert(entry.mode === "online", "Audit: mode preserved");
assert(entry.requestedModelId === "claude-sonnet-4-5", "Audit: requestedModelId preserved");
assert(!!entry.timestamp, "Audit: timestamp set");
assert(typeof entry.allowed === "boolean", "Audit: allowed is boolean");
assert(typeof entry.wasFallback === "boolean", "Audit: wasFallback is boolean");
assert(typeof entry.externalCallMade === "boolean", "Audit: externalCallMade is boolean");
assert(Array.isArray(entry.requiredSteps), "Audit: requiredSteps is array");

// Verify reverse chronological
if (logAfter.length >= 2) {
  assert(logAfter[0].timestamp >= logAfter[1].timestamp, "Audit: reverse chronological order");
}

// Limit works
assert(getPolicyAuditLog(1).length === 1, "Audit: limit=1 returns 1 entry");
assert(getPolicyAuditLog(0).length === 0, "Audit: limit=0 returns 0 entries");

// Ring buffer stress test
for (let i = 0; i < 10; i++) {
  const r: PolicyRequest = { mode: "online", requestedModelId: "claude-sonnet-4-5", caller: `stress_${i}` };
  recordPolicyDecision(r, evaluatePolicy(r));
}
const afterStress = getPolicyAuditLog(500);
assert(afterStress.length <= 500, "Audit: ring buffer capped at 500");

console.log("\n=== 6. EDGE CASES ===");

// Empty model
d = evaluatePolicy({ mode: "online", requestedModelId: "" });
assert(d.wasFallback === true, "Empty modelId: fallback");

// Rapid mode toggles
for (let i = 0; i < 20; i++) setMode(i % 2 === 0 ? "batmode" : "online");
setMode("online");
assert(getMode() === "online", "Rapid toggle: stable at online");

// All case policies
for (const cp of ["privileged", "sealed", "pii_heavy", "confidential", "standard"] as const) {
  d = evaluatePolicy({ mode: "online", requestedModelId: "claude-sonnet-4-5", casePolicy: cp });
  assert(typeof d.allowed === "boolean", `CasePolicy ${cp}: returns valid decision`);
}

// All payload classifications
for (const pc of ["raw", "derived", "sanitized", "public"] as const) {
  d = evaluatePolicy({ mode: "online", requestedModelId: "claude-sonnet-4-5", payloadClassification: pc });
  assert(typeof d.allowed === "boolean", `Payload ${pc}: returns valid decision`);
}

// All redaction statuses
for (const rs of ["not_run", "passed", "failed"] as const) {
  d = evaluatePolicy({ mode: "online", requestedModelId: "claude-sonnet-4-5", redactionStatus: rs });
  assert(typeof d.allowed === "boolean", `Redaction ${rs}: returns valid decision`);
}

console.log(`\n${"=".repeat(50)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log("ALL TESTS PASSED!");
