import type { Express } from "express";
import { db } from "../db";
import { clients, matters } from "@shared/models/tables";
import { eq } from "drizzle-orm";

interface FieldMapping {
  [externalField: string]: string;
}

const FIELD_MAPPINGS: Record<string, { clients: FieldMapping; matters: FieldMapping }> = {
  clio: {
    clients: {
      client_name: "name",
      client_email: "email",
      client_phone: "phone",
      company_name: "company",
      street_address: "address",
      client_notes: "notes",
    },
    matters: {
      matter_number: "caseNumber",
      matter_name: "name",
      practice_area: "practiceArea",
      matter_status: "status",
      matter_type: "matterType",
      open_date: "openedDate",
      close_date: "closedDate",
      court: "courtName",
      judge: "judgeAssigned",
      opposing_counsel: "opposingCounsel",
      description: "description",
    },
  },
  mycase: {
    clients: {
      contact_name: "name",
      email_address: "email",
      phone_number: "phone",
      organization: "company",
      mailing_address: "address",
      notes: "notes",
    },
    matters: {
      case_name: "name",
      case_number: "caseNumber",
      case_type: "matterType",
      case_status: "status",
      practice_area: "practiceArea",
      date_opened: "openedDate",
      date_closed: "closedDate",
      court_name: "courtName",
      assigned_judge: "judgeAssigned",
      opposing_attorney: "opposingCounsel",
      case_description: "description",
    },
  },
  practicepanther: {
    clients: {
      contact_name: "name",
      contact_email: "email",
      contact_phone: "phone",
      company_name: "company",
      address: "address",
      contact_notes: "notes",
    },
    matters: {
      matter_name: "name",
      account_number: "caseNumber",
      matter_type: "matterType",
      matter_status: "status",
      area_of_practice: "practiceArea",
      opened_date: "openedDate",
      closed_date: "closedDate",
      court: "courtName",
      judge_name: "judgeAssigned",
      opposing_counsel_name: "opposingCounsel",
      matter_description: "description",
    },
  },
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsvData(csvString: string): Record<string, string>[] {
  const lines = csvString.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

function mapFields(record: Record<string, any>, mapping: FieldMapping): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [extKey, intKey] of Object.entries(mapping)) {
    if (record[extKey] !== undefined && record[extKey] !== "") {
      mapped[intKey] = record[extKey];
    }
  }
  for (const [key, val] of Object.entries(record)) {
    if (!mapping[key] && val !== undefined && val !== "") {
      mapped[key] = val;
    }
  }
  return mapped;
}

interface ParsedData {
  clients: Record<string, any>[];
  matters: Record<string, any>[];
}

function parseImportData(format: string, rawData: string): ParsedData {
  if (format === "vericase") {
    const parsed = JSON.parse(rawData);
    if (parsed.firmData) {
      return {
        clients: parsed.firmData.clients || [],
        matters: parsed.firmData.matters || [],
      };
    }
    if (parsed.matterExport) {
      const result: ParsedData = { clients: [], matters: [] };
      if (parsed.matterExport.client) result.clients.push(parsed.matterExport.client);
      if (parsed.matterExport.matter) result.matters.push(parsed.matterExport.matter);
      return result;
    }
    return { clients: parsed.clients || [], matters: parsed.matters || [] };
  }

  const mapping = FIELD_MAPPINGS[format];
  if (!mapping) {
    throw new Error(`Unsupported format: ${format}`);
  }

  let rawRecords: Record<string, any>[];
  try {
    const jsonData = JSON.parse(rawData);
    rawRecords = Array.isArray(jsonData) ? jsonData : jsonData.data || jsonData.records || [];
  } catch {
    rawRecords = parseCsvData(rawData);
  }

  const clientRecords: Record<string, any>[] = [];
  const matterRecords: Record<string, any>[] = [];

  for (const record of rawRecords) {
    const hasClientFields = Object.keys(mapping.clients).some((k) => record[k] !== undefined);
    const hasMatterFields = Object.keys(mapping.matters).some((k) => record[k] !== undefined);

    if (hasClientFields) {
      clientRecords.push(mapFields(record, mapping.clients));
    }
    if (hasMatterFields) {
      matterRecords.push(mapFields(record, mapping.matters));
    }
  }

  return { clients: clientRecords, matters: matterRecords };
}

export function registerDataImportRoutes(app: Express): void {
  app.post("/api/import/validate", async (req, res) => {
    try {
      const { format, data } = req.body;

      if (!format || !data) {
        return res.status(400).json({ valid: false, warnings: ["Missing format or data"], entityCounts: {}, preview: {} });
      }

      const parsed = parseImportData(format, data);
      const warnings: string[] = [];

      const clientsWithoutName = parsed.clients.filter((c) => !c.name);
      if (clientsWithoutName.length > 0) {
        warnings.push(`${clientsWithoutName.length} client(s) missing name field`);
      }

      const mattersWithoutName = parsed.matters.filter((m) => !m.name);
      if (mattersWithoutName.length > 0) {
        warnings.push(`${mattersWithoutName.length} matter(s) missing name field`);
      }

      const existingClients = await db.select().from(clients);
      const existingEmails = new Set(existingClients.map((c) => c.email?.toLowerCase()).filter(Boolean));
      const duplicateClients = parsed.clients.filter((c) => c.email && existingEmails.has(c.email.toLowerCase()));
      if (duplicateClients.length > 0) {
        warnings.push(`${duplicateClients.length} client(s) already exist (matching email)`);
      }

      const existingMatters = await db.select().from(matters);
      const existingCaseNumbers = new Set(existingMatters.map((m) => m.caseNumber?.toLowerCase()).filter(Boolean));
      const duplicateMatters = parsed.matters.filter((m) => m.caseNumber && existingCaseNumbers.has(m.caseNumber.toLowerCase()));
      if (duplicateMatters.length > 0) {
        warnings.push(`${duplicateMatters.length} matter(s) already exist (matching case number)`);
      }

      res.json({
        valid: true,
        entityCounts: {
          clients: parsed.clients.length,
          matters: parsed.matters.length,
        },
        warnings,
        preview: {
          clients: parsed.clients.slice(0, 5),
          matters: parsed.matters.slice(0, 5),
        },
      });
    } catch (error: any) {
      console.error("Import validation error:", error);
      res.json({
        valid: false,
        entityCounts: {},
        warnings: [`Failed to parse data: ${error.message}`],
        preview: {},
      });
    }
  });

  app.post("/api/import/execute", async (req, res) => {
    try {
      const { format, data, options } = req.body;
      const skipDuplicates = options?.skipDuplicates ?? true;
      const overwriteExisting = options?.overwriteExisting ?? false;

      if (!format || !data) {
        return res.status(400).json({ success: false, imported: {}, skipped: 0, errors: ["Missing format or data"] });
      }

      const parsed = parseImportData(format, data);
      const errors: string[] = [];
      let skipped = 0;
      const imported = { clients: 0, matters: 0 };

      const existingClients = await db.select().from(clients);
      const emailToClient = new Map<string, any>();
      existingClients.forEach((c) => {
        if (c.email) emailToClient.set(c.email.toLowerCase(), c);
      });

      const existingMatters = await db.select().from(matters);
      const caseNumberToMatter = new Map<string, any>();
      existingMatters.forEach((m) => {
        if (m.caseNumber) caseNumberToMatter.set(m.caseNumber.toLowerCase(), m);
      });

      const clientIdMap = new Map<string, string>();

      for (const clientData of parsed.clients) {
        try {
          if (!clientData.name) {
            errors.push(`Skipped client with no name`);
            skipped++;
            continue;
          }

          const existingByEmail = clientData.email ? emailToClient.get(clientData.email.toLowerCase()) : null;

          if (existingByEmail) {
            if (skipDuplicates && !overwriteExisting) {
              skipped++;
              if (clientData.id) clientIdMap.set(clientData.id, existingByEmail.id);
              continue;
            }
            if (overwriteExisting) {
              await db.update(clients).set({
                name: clientData.name,
                phone: clientData.phone || existingByEmail.phone,
                company: clientData.company || existingByEmail.company,
                address: clientData.address || existingByEmail.address,
                notes: clientData.notes || existingByEmail.notes,
                updatedAt: new Date(),
              }).where(eq(clients.id, existingByEmail.id));
              imported.clients++;
              if (clientData.id) clientIdMap.set(clientData.id, existingByEmail.id);
              continue;
            }
          }

          const { id: _id, createdAt: _ca, updatedAt: _ua, ...insertData } = clientData;
          const [newClient] = await db.insert(clients).values({
            name: insertData.name,
            email: insertData.email || null,
            phone: insertData.phone || null,
            company: insertData.company || null,
            address: insertData.address || null,
            notes: insertData.notes || "",
          }).returning();
          imported.clients++;
          if (clientData.id) clientIdMap.set(clientData.id, newClient.id);
        } catch (err: any) {
          errors.push(`Failed to import client "${clientData.name}": ${err.message}`);
        }
      }

      for (const matterData of parsed.matters) {
        try {
          if (!matterData.name) {
            errors.push(`Skipped matter with no name`);
            skipped++;
            continue;
          }

          const existingByCaseNumber = matterData.caseNumber
            ? caseNumberToMatter.get(matterData.caseNumber.toLowerCase())
            : null;

          if (existingByCaseNumber) {
            if (skipDuplicates && !overwriteExisting) {
              skipped++;
              continue;
            }
            if (overwriteExisting) {
              await db.update(matters).set({
                name: matterData.name,
                matterType: matterData.matterType || existingByCaseNumber.matterType,
                status: matterData.status || existingByCaseNumber.status,
                practiceArea: matterData.practiceArea || existingByCaseNumber.practiceArea,
                description: matterData.description || existingByCaseNumber.description,
                courtName: matterData.courtName || existingByCaseNumber.courtName,
                judgeAssigned: matterData.judgeAssigned || existingByCaseNumber.judgeAssigned,
                opposingCounsel: matterData.opposingCounsel || existingByCaseNumber.opposingCounsel,
                updatedAt: new Date(),
              }).where(eq(matters.id, existingByCaseNumber.id));
              imported.matters++;
              continue;
            }
          }

          let resolvedClientId = matterData.clientId;
          if (resolvedClientId && clientIdMap.has(resolvedClientId)) {
            resolvedClientId = clientIdMap.get(resolvedClientId)!;
          }

          if (!resolvedClientId) {
            const allClients = await db.select().from(clients);
            if (allClients.length > 0) {
              resolvedClientId = allClients[0].id;
            } else {
              errors.push(`Skipped matter "${matterData.name}": no client available to link`);
              skipped++;
              continue;
            }
          }

          await db.insert(matters).values({
            clientId: resolvedClientId,
            name: matterData.name,
            caseNumber: matterData.caseNumber || null,
            matterType: matterData.matterType || "general",
            status: matterData.status || "active",
            practiceArea: matterData.practiceArea || "general",
            openedDate: matterData.openedDate || new Date().toISOString().split("T")[0],
            closedDate: matterData.closedDate || null,
            description: matterData.description || "",
            courtName: matterData.courtName || null,
            judgeAssigned: matterData.judgeAssigned || null,
            opposingCounsel: matterData.opposingCounsel || null,
          });
          imported.matters++;
        } catch (err: any) {
          errors.push(`Failed to import matter "${matterData.name}": ${err.message}`);
        }
      }

      res.json({
        success: errors.length === 0,
        imported,
        skipped,
        errors,
      });
    } catch (error: any) {
      console.error("Import execution error:", error);
      res.status(500).json({
        success: false,
        imported: {},
        skipped: 0,
        errors: [`Import failed: ${error.message}`],
      });
    }
  });
}
