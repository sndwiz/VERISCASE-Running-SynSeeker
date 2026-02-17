import type { Express } from "express";
import { db } from "../db";
import { sql, or, ilike } from "drizzle-orm";
import {
  clients,
  matters,
  matterContacts,
  tasks,
  boards,
  timeEntries,
  evidenceVaultFiles,
  invoices,
  calendarEvents,
  threads,
  detectiveNodes,
  fileItems,
} from "@shared/models/tables";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  description: string;
  matterId?: string | null;
  clientId?: string | null;
  url: string;
}

function scoreRelevance(value: string | null | undefined, query: string): number {
  if (!value) return 0;
  const lower = value.toLowerCase();
  const q = query.toLowerCase();
  if (lower === q) return 3;
  if (lower.startsWith(q)) return 2;
  if (lower.includes(q)) return 1;
  return 0;
}

function bestScore(fields: (string | null | undefined)[], query: string): number {
  let max = 0;
  for (const f of fields) {
    const s = scoreRelevance(f, query);
    if (s > max) max = s;
  }
  return max;
}

export function registerGlobalSearchRoutes(app: Express): void {
  app.get("/api/search", async (req, res) => {
    try {
      const q = (req.query.q as string || "").trim();
      const typesParam = req.query.types as string | undefined;
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);

      if (!q || q.length < 2) {
        return res.json([]);
      }

      const pattern = `%${q}%`;
      const allowedTypes = typesParam
        ? typesParam.split(",").map((t) => t.trim().toLowerCase())
        : null;

      const shouldSearch = (type: string) => !allowedTypes || allowedTypes.includes(type);

      const results: SearchResult[] = [];

      const searches = [];

      if (shouldSearch("clients")) {
        searches.push(
          db
            .select()
            .from(clients)
            .where(
              or(
                ilike(clients.name, pattern),
                ilike(clients.email, pattern),
                ilike(clients.phone, pattern),
                ilike(clients.company, pattern)
              )
            )
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "clients",
                  title: r.name,
                  subtitle: r.company || r.email || "",
                  description: [r.email, r.phone].filter(Boolean).join(" | "),
                  clientId: r.id,
                  url: `/client-dashboard/${r.id}`,
                })
              )
            )
        );
      }

      if (shouldSearch("matters")) {
        searches.push(
          db
            .select()
            .from(matters)
            .where(
              or(
                ilike(matters.name, pattern),
                ilike(matters.caseNumber, pattern),
                ilike(matters.description, pattern),
                ilike(matters.practiceArea, pattern),
                ilike(matters.courtName, pattern),
                ilike(matters.judgeAssigned, pattern),
                ilike(matters.opposingCounsel, pattern)
              )
            )
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "matters",
                  title: r.name,
                  subtitle: [r.caseNumber, r.practiceArea].filter(Boolean).join(" | "),
                  description: r.description || "",
                  matterId: r.id,
                  clientId: r.clientId,
                  url: `/matters/${r.id}`,
                })
              )
            )
        );
      }

      if (shouldSearch("mattercontacts")) {
        searches.push(
          db
            .select()
            .from(matterContacts)
            .where(
              or(
                ilike(matterContacts.name, pattern),
                ilike(matterContacts.email, pattern),
                ilike(matterContacts.phone, pattern),
                ilike(matterContacts.company, pattern)
              )
            )
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "mattercontacts",
                  title: r.name,
                  subtitle: [r.role, r.company].filter(Boolean).join(" | "),
                  description: [r.email, r.phone].filter(Boolean).join(" | "),
                  matterId: r.matterId,
                  url: `/matters/${r.matterId}`,
                })
              )
            )
        );
      }

      if (shouldSearch("tasks")) {
        searches.push(
          db
            .select()
            .from(tasks)
            .where(
              or(
                ilike(tasks.title, pattern),
                ilike(tasks.description, pattern),
                ilike(tasks.notes, pattern)
              )
            )
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "tasks",
                  title: r.title,
                  subtitle: `Status: ${r.status || "none"} | Priority: ${r.priority || "none"}`,
                  description: r.description || "",
                  url: `/my-tasks`,
                })
              )
            )
        );
      }

      if (shouldSearch("boards")) {
        searches.push(
          db
            .select()
            .from(boards)
            .where(
              or(
                ilike(boards.name, pattern),
                ilike(boards.description, pattern)
              )
            )
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "boards",
                  title: r.name,
                  subtitle: "Board",
                  description: r.description || "",
                  url: `/boards/${r.id}`,
                })
              )
            )
        );
      }

      if (shouldSearch("timeentries")) {
        searches.push(
          db
            .select()
            .from(timeEntries)
            .where(
              or(
                ilike(timeEntries.description, pattern),
                ilike(timeEntries.userName, pattern)
              )
            )
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "timeentries",
                  title: r.description,
                  subtitle: `${r.userName} | ${r.hours}h`,
                  description: `Date: ${r.date}`,
                  matterId: r.matterId,
                  url: `/time-tracking`,
                })
              )
            )
        );
      }

      if (shouldSearch("evidence")) {
        searches.push(
          db
            .select()
            .from(evidenceVaultFiles)
            .where(
              or(
                ilike(evidenceVaultFiles.originalName, pattern),
                ilike(evidenceVaultFiles.description, pattern)
              )
            )
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "evidence",
                  title: r.originalName,
                  subtitle: `Type: ${r.evidenceType || "document"}`,
                  description: r.description || "",
                  matterId: r.matterId,
                  url: `/evidence`,
                })
              )
            )
        );
      }

      if (shouldSearch("invoices")) {
        searches.push(
          db
            .select()
            .from(invoices)
            .where(
              or(
                ilike(invoices.invoiceNumber, pattern),
                ilike(invoices.notes, pattern)
              )
            )
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "invoices",
                  title: `Invoice #${r.invoiceNumber}`,
                  subtitle: `Status: ${r.status} | $${r.totalAmount?.toFixed(2)}`,
                  description: r.notes || "",
                  clientId: r.clientId,
                  matterId: r.matterId,
                  url: `/billing`,
                })
              )
            )
        );
      }

      if (shouldSearch("calendar")) {
        searches.push(
          db
            .select()
            .from(calendarEvents)
            .where(
              or(
                ilike(calendarEvents.title, pattern),
                ilike(calendarEvents.description, pattern),
                ilike(calendarEvents.location, pattern)
              )
            )
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "calendar",
                  title: r.title,
                  subtitle: `${r.eventType} | ${r.startDate}`,
                  description: r.location || r.description || "",
                  matterId: r.matterId,
                  url: `/calendar`,
                })
              )
            )
        );
      }

      if (shouldSearch("threads")) {
        searches.push(
          db
            .select()
            .from(threads)
            .where(ilike(threads.subject, pattern))
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "threads",
                  title: r.subject,
                  subtitle: `Status: ${r.status || "open"}`,
                  description: "",
                  matterId: r.matterId,
                  url: `/communications`,
                })
              )
            )
        );
      }

      if (shouldSearch("detective")) {
        searches.push(
          db
            .select()
            .from(detectiveNodes)
            .where(
              or(
                ilike(detectiveNodes.title, pattern),
                ilike(detectiveNodes.description, pattern)
              )
            )
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "detective",
                  title: r.title,
                  subtitle: `Type: ${r.type}`,
                  description: r.description || "",
                  matterId: r.matterId,
                  url: `/detective`,
                })
              )
            )
        );
      }

      if (shouldSearch("files")) {
        searches.push(
          db
            .select()
            .from(fileItems)
            .where(ilike(fileItems.fileName, pattern))
            .limit(limit)
            .then((rows) =>
              rows.forEach((r) =>
                results.push({
                  id: r.id,
                  type: "files",
                  title: r.fileName,
                  subtitle: r.extension ? `.${r.extension}` : "File",
                  description: "",
                  matterId: r.matterId,
                  url: `/documents`,
                })
              )
            )
        );
      }

      await Promise.all(searches);

      results.sort((a, b) => {
        const scoreA = bestScore([a.title, a.subtitle, a.description], q);
        const scoreB = bestScore([b.title, b.subtitle, b.description], q);
        return scoreB - scoreA;
      });

      res.json(results.slice(0, limit));
    } catch (error) {
      console.error("Global search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });
}
