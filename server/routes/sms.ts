import type { Express, Request, Response } from "express";
import { db } from "../db";
import { smsMessages } from "@shared/models/tables";
import { eq, desc, and, or, sql } from "drizzle-orm";

export function registerSmsRoutes(app: Express): void {
  app.get("/api/sms/messages", async (req: Request, res: Response) => {
    try {
      const { clientId, phoneNumber } = req.query;
      const conditions = [];
      if (clientId) conditions.push(eq(smsMessages.clientId, clientId as string));
      if (phoneNumber) conditions.push(eq(smsMessages.phoneNumber, phoneNumber as string));

      const messages = await db
        .select()
        .from(smsMessages)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(smsMessages.createdAt))
        .limit(200);

      res.json(messages);
    } catch (error) {
      console.error("SMS list error:", error);
      res.status(500).json({ error: "Failed to fetch SMS messages" });
    }
  });

  app.post("/api/sms/messages", async (req: Request, res: Response) => {
    try {
      const { phoneNumber, contactName, body, clientId, matterId } = req.body;
      if (!phoneNumber || !body) {
        return res.status(400).json({ error: "Phone number and message body are required" });
      }

      const user = (req as any).user;
      const sentBy = user?.id || "system";
      const sentByName = user?.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : user?.email || "System";

      let twilioSid: string | null = null;
      let status = "sent";
      let warning: string | undefined;

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (accountSid && authToken && fromNumber) {
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
          const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
          const params = new URLSearchParams({
            To: phoneNumber,
            From: fromNumber,
            Body: body,
          });

          const twilioRes = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          const twilioData = await twilioRes.json();
          if (twilioRes.ok) {
            twilioSid = twilioData.sid;
            status = twilioData.status || "sent";
          } else {
            status = "failed";
            warning = `Twilio error: ${twilioData.message || "Unknown error"}`;
          }
        } catch (err: any) {
          status = "failed";
          warning = `Twilio request failed: ${err.message}`;
        }
      } else {
        warning = "Twilio is not configured. Message recorded locally only.";
      }

      const [message] = await db
        .insert(smsMessages)
        .values({
          phoneNumber,
          contactName: contactName || "Unknown",
          body,
          direction: "outbound",
          status,
          twilioSid,
          sentBy,
          sentByName,
          clientId: clientId || null,
          matterId: matterId || null,
        })
        .returning();

      res.json({ message, warning });
    } catch (error) {
      console.error("SMS send error:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  app.get("/api/sms/messages/conversation/:phoneNumber", async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.params;
      const messages = await db
        .select()
        .from(smsMessages)
        .where(eq(smsMessages.phoneNumber, phoneNumber))
        .orderBy(smsMessages.createdAt);

      res.json(messages);
    } catch (error) {
      console.error("SMS conversation error:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.get("/api/sms/settings", async (_req: Request, res: Response) => {
    try {
      const configured = !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
      );

      res.json({
        configured,
        accountSid: process.env.TWILIO_ACCOUNT_SID
          ? `${process.env.TWILIO_ACCOUNT_SID.slice(0, 6)}...${process.env.TWILIO_ACCOUNT_SID.slice(-4)}`
          : null,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
      });
    } catch (error) {
      console.error("SMS settings error:", error);
      res.status(500).json({ error: "Failed to fetch SMS settings" });
    }
  });

  app.post("/api/sms/settings", async (req: Request, res: Response) => {
    try {
      const { accountSid, authToken, phoneNumber } = req.body;

      if (accountSid) process.env.TWILIO_ACCOUNT_SID = accountSid;
      if (authToken) process.env.TWILIO_AUTH_TOKEN = authToken;
      if (phoneNumber) process.env.TWILIO_PHONE_NUMBER = phoneNumber;

      res.json({
        success: true,
        configured: !!(
          process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_AUTH_TOKEN &&
          process.env.TWILIO_PHONE_NUMBER
        ),
        message: "Twilio configuration saved for this session. Set environment variables for persistence.",
      });
    } catch (error) {
      console.error("SMS settings save error:", error);
      res.status(500).json({ error: "Failed to save SMS settings" });
    }
  });

  app.get("/api/sms/contacts", async (_req: Request, res: Response) => {
    try {
      const contacts = await db.execute(sql`
        SELECT DISTINCT ON (phone_number) 
          phone_number,
          contact_name,
          client_id,
          matter_id,
          body as last_message,
          direction as last_direction,
          created_at as last_message_at
        FROM sms_messages
        ORDER BY phone_number, created_at DESC
      `);

      res.json(contacts.rows);
    } catch (error) {
      console.error("SMS contacts error:", error);
      res.status(500).json({ error: "Failed to fetch SMS contacts" });
    }
  });
}
