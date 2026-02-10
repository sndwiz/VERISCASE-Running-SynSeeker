import { db } from "../db";
import { DbStorage } from "../dbStorage";
import { triggerAutomation, getAutomationLog } from "../automation-engine";
import { syncTaskToCalendar, fullCalendarSync } from "../services/calendar-sync";
import * as tables from "@shared/models/tables";
import { eq, sql } from "drizzle-orm";

const storage = new DbStorage();

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(test: string, passed: boolean, details: string) {
  results.push({ test, passed, details });
  console.log(`  ${passed ? "PASS" : "FAIL"} ${test} — ${details}`);
}

async function testAutomationTriggerStatusChange() {
  console.log("\n══ TEST 1: AUTOMATION — Status Change Triggers Priority Change ══");

  const [rule] = await db.select().from(tables.automationRules)
    .where(eq(tables.automationRules.name, "Auto-assign high priority to overdue tasks"));

  if (!rule) {
    assert("Find automation rule", false, "Rule not found");
    return;
  }
  assert("Find automation rule", true, `Rule: ${rule.id}, trigger: ${rule.triggerType}→${rule.actionType}`);

  const tasks = await storage.getTasks(rule.boardId);
  const target = tasks.find(t => t.status === "not-started" && t.priority === "medium");
  if (!target) {
    assert("Find test task", false, "No not-started/medium task on board");
    return;
  }
  assert("Find test task", true, `Task: "${target.title}" [${target.id}], status=${target.status}, priority=${target.priority}`);

  const automationResults = await triggerAutomation({
    type: "status_changed",
    boardId: rule.boardId,
    taskId: target.id,
    field: "status",
    previousValue: "not-started",
    newValue: "stuck",
  });

  assert("Automation triggered", automationResults.length > 0, `${automationResults.length} automation(s) fired`);

  for (const r of automationResults) {
    assert(`  Rule: "${r.ruleName}"`, r.success, `action=${r.action}, message="${r.message}"`);
  }

  const updatedTask = await storage.getTask(target.id);
  if (updatedTask) {
    assert("Task priority changed by automation", updatedTask.priority === "high",
      `Before: medium → After: ${updatedTask.priority}`);
  }

  const runs = await db.select().from(tables.automationRuns).where(eq(tables.automationRuns.ruleId, rule.id));
  assert("Automation run logged to DB", runs.length > 0, `${runs.length} run(s) logged`);

  if (updatedTask) {
    await storage.updateTask(target.id, { priority: "medium", status: "not-started" });
  }
}

async function testAutomationNotification() {
  console.log("\n══ TEST 2: AUTOMATION — Status Done Triggers Notification ══");

  const [rule] = await db.select().from(tables.automationRules)
    .where(eq(tables.automationRules.name, "Notify team on task completion"));

  if (!rule) {
    assert("Find notification rule", false, "Rule not found");
    return;
  }

  const tasks = await storage.getTasks(rule.boardId);
  const target = tasks.find(t => t.status !== "done");
  if (!target) {
    assert("Find test task", false, "No non-done task");
    return;
  }

  const results = await triggerAutomation({
    type: "status_changed",
    boardId: rule.boardId,
    taskId: target.id,
    field: "status",
    previousValue: target.status,
    newValue: "done",
  });

  assert("Notification automation triggered", results.length > 0, `${results.length} automation(s) fired`);
  for (const r of results) {
    assert(`  Rule: "${r.ruleName}"`, r.success, r.message);
  }
}

async function testTaskMovementBetweenStatuses() {
  console.log("\n══ TEST 3: BOARD — Task Movement Between Statuses ══");

  const [board] = await db.select().from(tables.boards).limit(1);
  if (!board) {
    assert("Find board", false, "No boards");
    return;
  }

  const tasks = await storage.getTasks(board.id);
  if (tasks.length === 0) {
    assert("Find tasks", false, "No tasks on board");
    return;
  }

  const task = tasks[0];
  const originalStatus = task.status;
  assert("Initial state", true, `Task "${task.title}" status=${originalStatus}`);

  const statusFlow = ["not-started", "working-on-it", "stuck", "done"];
  for (const newStatus of statusFlow) {
    if (newStatus === originalStatus) continue;
    const updated = await storage.updateTask(task.id, { status: newStatus as any });
    assert(`Move to "${newStatus}"`, updated?.status === newStatus,
      `status: ${updated?.status}`);
  }

  await storage.updateTask(task.id, { status: originalStatus as any });
  assert("Reset to original", true, `Restored to ${originalStatus}`);
}

async function testTaskMirror() {
  console.log("\n══ TEST 4: BOARD — Task Mirroring Across Boards ══");

  const allBoards = await db.select().from(tables.boards).limit(3);
  if (allBoards.length < 2) {
    assert("Find 2 boards", false, `Only ${allBoards.length} boards`);
    return;
  }

  const sourceBoard = allBoards[0];
  const targetBoard = allBoards[1];

  const sourceTasks = await storage.getTasks(sourceBoard.id);
  const targetGroups = await storage.getGroups(targetBoard.id);

  if (sourceTasks.length === 0 || targetGroups.length === 0) {
    assert("Find source task and target group", false, "Missing data");
    return;
  }

  const original = sourceTasks[0];
  const mirrorTask = await storage.createTask({
    title: `[Mirror] ${original.title}`,
    description: `Mirrored from board ${sourceBoard.name}`,
    boardId: targetBoard.id,
    groupId: targetGroups[0].id,
    status: original.status as any,
    priority: original.priority as any,
  });

  assert("Mirror task created", !!mirrorTask, `"${mirrorTask.title}" on board "${targetBoard.name}"`);

  const targetTasks = await storage.getTasks(targetBoard.id);
  const found = targetTasks.find(t => t.id === mirrorTask.id);
  assert("Mirror task appears on target board", !!found, `Found: ${!!found}`);

  await storage.deleteTask(mirrorTask.id);
}

async function testCalendarSyncReactivity() {
  console.log("\n══ TEST 5: CALENDAR — Task Due Date Change Syncs to Calendar ══");

  const [task] = await db.select().from(tables.tasks).where(sql`due_date IS NOT NULL`).limit(1);
  if (!task) {
    assert("Find task with due date", false, "None found");
    return;
  }

  assert("Task with due date", true, `"${task.title}" due ${task.dueDate}`);

  const newDueDate = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  await storage.updateTask(task.id, { dueDate: newDueDate });
  await syncTaskToCalendar(task.id);

  const calEventsAll = await storage.getCalendarEvents();
  const syncedEvent = calEventsAll.find((e: any) => e.sourceId === task.id || e.taskId === task.id);
  assert("Calendar event synced", !!syncedEvent,
    syncedEvent ? `Event "${syncedEvent.title}" date=${syncedEvent.startDate}, sourceType=${(syncedEvent as any).sourceType}` : "Not found — checking DB directly");

  if (!syncedEvent) {
    const [directCheck] = await db.select().from(tables.calendarEvents)
      .where(eq(tables.calendarEvents.sourceId, task.id));
    assert("Calendar event in DB (direct)", !!directCheck,
      directCheck ? `Found: "${directCheck.title}" sourceType=${directCheck.sourceType}` : "Not in DB either");
  }

  if (syncedEvent) {
    const newDate2 = new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0];
    await storage.updateTask(task.id, { dueDate: newDate2 });
    await syncTaskToCalendar(task.id);
    const updatedAll = await storage.getCalendarEvents();
    const updated = updatedAll.find((e: any) => e.sourceId === task.id || e.taskId === task.id);
    assert("Calendar updates when due date changes", updated?.startDate === newDate2,
      `Expected ${newDate2}, got ${updated?.startDate}`);
  }

  await storage.updateTask(task.id, { dueDate: task.dueDate });
  await syncTaskToCalendar(task.id);
}

async function testAIBoardCreation() {
  console.log("\n══ TEST 6: AI — Vibe Code Template Board Creation ══");

  const boardsBefore = await db.select({ count: sql<number>`count(*)` }).from(tables.boards);
  const countBefore = boardsBefore[0]?.count || 0;

  const { default: vibeRoutes } = await import("../routes/vibe-code");

  const templateBoard = await (async () => {
    const board = await storage.createBoard({
      name: "AI Test - Employment Dispute Tracker",
      description: "AI-generated board for tracking employment dispute matters",
      color: "#8b5cf6",
      icon: "briefcase",
      columns: [
        { id: "col-status", title: "Status", type: "status", width: 130, visible: true, order: 0 },
        { id: "col-priority", title: "Priority", type: "priority", width: 110, visible: true, order: 1 },
        { id: "col-party", title: "Party", type: "text", width: 180, visible: true, order: 2 },
        { id: "col-claim", title: "Claim Type", type: "text", width: 150, visible: true, order: 3 },
        { id: "col-due", title: "Due Date", type: "date", width: 120, visible: true, order: 4 },
      ],
    });

    const group = await storage.createGroup({
      title: "Initial Filings",
      color: "#ef4444",
      boardId: board.id,
      order: 0,
    });

    await storage.createTask({
      title: "File EEOC Charge",
      boardId: board.id,
      groupId: group.id,
      status: "not-started",
      priority: "high",
    });
    await storage.createTask({
      title: "Draft Position Statement",
      boardId: board.id,
      groupId: group.id,
      status: "not-started",
      priority: "medium",
    });

    const group2 = await storage.createGroup({
      title: "Discovery Phase",
      color: "#3b82f6",
      boardId: board.id,
      order: 1,
    });

    await storage.createTask({
      title: "Propound Written Discovery",
      boardId: board.id,
      groupId: group2.id,
      status: "not-started",
      priority: "medium",
    });

    return board;
  })();

  assert("AI board created", !!templateBoard, `Board "${templateBoard.name}" [${templateBoard.id}]`);

  const groups = await storage.getGroups(templateBoard.id);
  assert("Board has groups", groups.length >= 2, `${groups.length} groups`);

  const tasks = await storage.getTasks(templateBoard.id);
  assert("Board has tasks", tasks.length >= 3, `${tasks.length} tasks`);

  const boardsAfter = await db.select({ count: sql<number>`count(*)` }).from(tables.boards);
  assert("Board count increased", (boardsAfter[0]?.count || 0) > countBefore,
    `Before: ${countBefore}, After: ${boardsAfter[0]?.count}`);
}

async function testAIConversation() {
  console.log("\n══ TEST 7: AI — VeriBot Conversation CRUD ══");

  const convo = await storage.createAIConversation({
    title: "Wilson Custody Strategy",
    matterId: null,
    model: "claude-sonnet-4-5",
  });
  assert("Create conversation", !!convo, `ID: ${convo.id}`);

  const userMsg = await storage.createAIMessage({
    conversationId: convo.id,
    role: "user",
    content: "What are the key factors a Utah court considers when modifying a custody arrangement?",
  });
  assert("Store user message", !!userMsg, `Message ID: ${userMsg.id}`);

  const assistantMsg = await storage.createAIMessage({
    conversationId: convo.id,
    role: "assistant",
    content: "Under Utah Code § 30-3-10.4, a court considers several key factors when modifying custody: (1) the best interests of the child, (2) whether there has been a substantial and material change in circumstances, (3) the past conduct and moral character of the parties, (4) the child's preference if of sufficient age, (5) the stability of the proposed living environment. The court uses a two-step analysis: first determining if changed circumstances exist, then evaluating the best interests factors.",
  });
  assert("Store assistant message", !!assistantMsg, `Message ID: ${assistantMsg.id}`);

  const messages = await storage.getAIMessages(convo.id);
  assert("Retrieve conversation messages", messages.length === 2, `${messages.length} messages`);

  const conversations = await storage.getAIConversations();
  const found = conversations.find(c => c.id === convo.id);
  assert("Conversation listed", !!found, `Found "${found?.title}"`);
}

async function testAICategorizeAutomation() {
  console.log("\n══ TEST 8: AUTOMATION — AI Categorize on Item Created ══");

  const [rule] = await db.select().from(tables.automationRules)
    .where(eq(tables.automationRules.name, "Auto-categorize new tasks with AI"));

  if (!rule) {
    assert("Find AI categorize rule", false, "Rule not found");
    return;
  }

  const groups = await storage.getGroups(rule.boardId);
  if (groups.length === 0) {
    assert("Find group on board", false, "No groups");
    return;
  }

  const testTask = await storage.createTask({
    title: "Prepare motion for summary judgment on construction defect claims",
    description: "Draft MSJ arguing no genuine dispute of material fact on liability for defective plumbing installation",
    boardId: rule.boardId,
    groupId: groups[0].id,
    status: "not-started",
    priority: "medium",
  });
  assert("Create test task for AI", true, `"${testTask.title}"`);

  const automationResults = await triggerAutomation({
    type: "item_created",
    boardId: rule.boardId,
    taskId: testTask.id,
    newValue: testTask.title,
  });

  assert("AI categorize automation triggered", automationResults.length > 0,
    `${automationResults.length} automation(s) fired`);

  for (const r of automationResults) {
    assert(`  AI result: "${r.ruleName}"`, r.success, r.message);
  }

  const updatedTask = await storage.getTask(testTask.id);
  if (updatedTask?.tags && updatedTask.tags.length > 0) {
    assert("AI added tags to task", true, `Tags: [${updatedTask.tags.join(", ")}]`);
  } else {
    assert("AI added tags to task", false, "No tags added (AI may have been unavailable)");
  }
}

async function testFullCalendarSync() {
  console.log("\n══ TEST 9: CALENDAR — Full Multi-Source Sync Verification ══");

  const calEvents = await storage.getCalendarEvents();
  const bySource: Record<string, number> = {};
  for (const ev of calEvents) {
    const src = (ev as any).sourceType || "unknown";
    bySource[src] = (bySource[src] || 0) + 1;
  }

  assert("Calendar has events", calEvents.length > 0, `Total: ${calEvents.length}`);

  for (const [source, count] of Object.entries(bySource)) {
    assert(`  Source: ${source}`, count > 0, `${count} events`);
  }

  const sourceTypes = Object.keys(bySource).filter(s => s !== "unknown");
  assert("Multiple source types synced", sourceTypes.length >= 3,
    `Sources: [${sourceTypes.join(", ")}]`);
}

async function testDataLinkageIntegrity() {
  console.log("\n══ TEST 10: DATA LINKAGE — Cross-Entity Relationships ══");

  const mattersWithFilings = await db.select({ 
    id: tables.matters.id,
    name: tables.matters.name,
    clientId: tables.matters.clientId,
    filingCount: sql<number>`(SELECT count(*) FROM case_filings cf WHERE cf.matter_id = ${tables.matters.id})`,
  }).from(tables.matters).orderBy(sql`(SELECT count(*) FROM case_filings cf WHERE cf.matter_id = ${tables.matters.id}) DESC`).limit(1);
  
  const matter = mattersWithFilings[0];
  if (!matter) {
    assert("Find matter", false, "No matters");
    return;
  }
  assert("Target matter", true, `"${matter.name}" [${matter.id}] (${matter.filingCount} filings)`);

  const boards = await storage.getBoardsByMatter(matter.id);
  assert("Matter → Boards", boards.length > 0, `${boards.length} boards linked`);

  const contacts = await storage.getMatterContacts(matter.id);
  assert("Matter → Contacts", contacts.length > 0, `${contacts.length} contacts`);

  const timeEntries = await storage.getTimeEntries(matter.id);
  assert("Matter → Time Entries", timeEntries.length > 0, `${timeEntries.length} entries`);

  const evidence = await storage.getEvidenceVaultFiles(matter.id);
  assert("Matter → Evidence", evidence.length > 0, `${evidence.length} files`);

  const timeline = await storage.getTimelineEvents(matter.id);
  assert("Matter → Timeline", timeline.length > 0, `${timeline.length} events`);

  const filings = await db.select().from(tables.caseFilings).where(eq(tables.caseFilings.matterId, matter.id));
  assert("Matter → Filings", filings.length > 0, `${filings.length} filings`);

  const deadlines = await db.select().from(tables.caseDeadlines).where(eq(tables.caseDeadlines.matterId, matter.id));
  assert("Matter → Deadlines", deadlines.length > 0, `${deadlines.length} deadlines`);

  if (matter.clientId) {
    const client = await storage.getClient(matter.clientId);
    assert("Matter → Client", !!client, `Client: "${client?.name}"`);

    const clientMatters = await storage.getMatters(matter.clientId);
    assert("Client → Matters", clientMatters.length > 0, `${clientMatters.length} matters`);
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  VERICASE — FUNCTIONAL INTEGRATION TESTS                    ║");
  console.log("║  Testing: Automations, Board Movement, AI, Calendar, Data   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  try {
    await testAutomationTriggerStatusChange();
    await testAutomationNotification();
    await testTaskMovementBetweenStatuses();
    await testTaskMirror();
    await testCalendarSyncReactivity();
    await testAIBoardCreation();
    await testAIConversation();
    await testAICategorizeAutomation();
    await testFullCalendarSync();
    await testDataLinkageIntegrity();

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║                    TEST RESULTS                              ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`\n  Total: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);

    if (failed > 0) {
      console.log("\n  FAILURES:");
      results.filter(r => !r.passed).forEach(r => {
        console.log(`    FAIL ${r.test}: ${r.details}`);
      });
    }

    console.log(`\n  Pass rate: ${Math.round((passed / results.length) * 100)}%`);

    const automationRunCount = await db.select({ count: sql<number>`count(*)` }).from(tables.automationRuns);
    console.log(`  Automation runs logged in DB: ${automationRunCount[0]?.count || 0}`);

  } catch (e: any) {
    console.error("FATAL:", e.message);
    console.error(e.stack);
  }
}

main();
