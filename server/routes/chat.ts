import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../db";
import {
  boardChats, chatMessages, chatMessageEntities, chatAttachments,
  actionProposals, actionProposalItems,
  tasks,
} from "../../shared/models/tables";
import { users } from "../../shared/models/auth";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { sendChatMessageSchema, approveProposalSchema } from "../../shared/schema";
import { broadcastMessage, broadcastProposal, broadcastProposalUpdate } from "../socket";
import { parseMessageEntities } from "../services/chat-parser";
import { detectActionProposals } from "../services/chat-actions";
import { getUserId, getUserInfo } from "../utils/auth";

const router = Router();

async function getOrCreateChat(scopeType: string, scopeField: string, scopeValue: string) {
  const rows = await db.execute(
    sql`SELECT * FROM board_chats WHERE scope_type = ${scopeType} AND ${sql.raw(scopeField)} = ${scopeValue} LIMIT 1`
  );
  if (rows.rows && rows.rows.length > 0) {
    return rows.rows[0] as any;
  }
  const insertResult = await db.execute(
    sql`INSERT INTO board_chats (id, scope_type, ${sql.raw(scopeField)}) VALUES (gen_random_uuid(), ${scopeType}, ${scopeValue}) RETURNING *`
  );
  return (insertResult.rows as any[])[0];
}

async function fetchMessagesForChat(chatId: string, limit: number = 50) {
  const messages = await db.select().from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  const messageIds = messages.map(m => m.id);
  let entities: any[] = [];
  let attachments: any[] = [];

  if (messageIds.length > 0) {
    entities = await db.select().from(chatMessageEntities)
      .where(inArray(chatMessageEntities.messageId, messageIds));
    attachments = await db.select().from(chatAttachments)
      .where(inArray(chatAttachments.messageId, messageIds));
  }

  const senderIds = Array.from(new Set(messages.map(m => m.senderUserId)));
  let senderMap: Record<string, any> = {};
  if (senderIds.length > 0) {
    const senders = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
    }).from(users).where(inArray(users.id, senderIds));
    senderMap = Object.fromEntries(senders.map(s => [s.id, s]));
  }

  return messages.map(m => ({
    ...m,
    sender: senderMap[m.senderUserId] || { id: m.senderUserId },
    entities: entities.filter(e => e.messageId === m.id),
    attachments: attachments.filter(a => a.messageId === m.id),
  })).reverse();
}

router.get("/board/:boardId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const chat = await getOrCreateChat("board", "board_id", req.params.boardId as string);
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await fetchMessagesForChat(chat.id as string, limit);

    res.json({ chatId: chat.id, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/client/:clientId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const chat = await getOrCreateChat("client", "client_id", req.params.clientId as string);
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await fetchMessagesForChat(chat.id as string, limit);

    res.json({ chatId: chat.id, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/matter/:matterId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const chat = await getOrCreateChat("matter", "matter_id", req.params.matterId as string);
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await fetchMessagesForChat(chat.id as string, limit);

    res.json({ chatId: chat.id, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:chatId/messages", async (req: Request, res: Response) => {
  try {
    const chatId = req.params.chatId as string;
    const userInfo = getUserInfo(req);
    if (!userInfo) return res.status(401).json({ error: "Unauthorized" });

    const chatCheck = await db.execute(sql`SELECT id FROM board_chats WHERE id = ${chatId} LIMIT 1`);
    if (!chatCheck.rows || chatCheck.rows.length === 0) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const parsed = sendChatMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid message data", details: parsed.error.flatten() });
    }

    const { bodyText, replyToMessageId } = parsed.data;
    const entities = parseMessageEntities(bodyText);
    const richJson = entities.length > 0 ? { entities } : null;

    const [message] = await db.insert(chatMessages).values({
      chatId,
      senderUserId: userInfo.id,
      bodyText,
      bodyRichJson: richJson,
      replyToMessageId: replyToMessageId || null,
    }).returning();

    if (entities.length > 0) {
      for (const entity of entities) {
        await db.insert(chatMessageEntities).values({
          messageId: message.id,
          entityType: entity.type,
          value: entity.value,
          startIndex: entity.startIndex,
          endIndex: entity.endIndex,
        });
      }
    }

    const enrichedMessage = {
      ...message,
      sender: {
        id: userInfo.id,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        profileImageUrl: userInfo.profileImageUrl,
      },
      entities,
      attachments: [],
    };

    broadcastMessage(chatId, enrichedMessage);

    const chatRows = await db.execute(
      sql`SELECT * FROM board_chats WHERE id = ${chatId} LIMIT 1`
    );
    const chat = chatRows.rows?.[0] as any;

    if (chat) {
      try {
        const proposals = await detectActionProposals(
          bodyText,
          entities,
          message.id,
          {
            id: chat.id,
            scopeType: chat.scope_type,
            boardId: chat.board_id,
            clientId: chat.client_id,
            matterId: chat.matter_id,
          },
          userInfo.id,
        );
        if (proposals && proposals.length > 0) {
          for (const proposal of proposals) {
            broadcastProposal(chatId, proposal);
          }
        }
      } catch (err) {
        console.error("Action detection error:", err);
      }
    }

    res.json(enrichedMessage);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:chatId/members", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const allUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      profileImageUrl: users.profileImageUrl,
    }).from(users);

    res.json(allUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:chatId/proposals", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const chatId = req.params.chatId as string;
    const proposalRows = await db.execute(
      sql`SELECT * FROM action_proposals WHERE chat_id = ${chatId} ORDER BY created_at DESC`
    );
    const proposals = proposalRows.rows as any[];

    const proposalIds = proposals.map((p: any) => p.id);
    let items: any[] = [];
    if (proposalIds.length > 0) {
      items = await db.select().from(actionProposalItems)
        .where(inArray(actionProposalItems.proposalId, proposalIds));
    }

    const enriched = proposals.map((p: any) => ({
      ...p,
      items: items.filter(i => i.proposalId === p.id),
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/proposals/:proposalId/approve", async (req: Request, res: Response) => {
  try {
    const proposalId = req.params.proposalId as string;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await db.execute(
      sql`UPDATE action_proposals SET status = 'approved', updated_at = NOW() WHERE id = ${proposalId}`
    );

    const proposalRows = await db.execute(
      sql`SELECT * FROM action_proposals WHERE id = ${proposalId} LIMIT 1`
    );
    const proposal = proposalRows.rows?.[0] as any;

    if (proposal?.chat_id) {
      broadcastProposalUpdate(proposal.chat_id, { ...proposal, status: "approved" });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/proposals/:proposalId/reject", async (req: Request, res: Response) => {
  try {
    const proposalId = req.params.proposalId as string;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await db.execute(
      sql`UPDATE action_proposals SET status = 'rejected', updated_at = NOW() WHERE id = ${proposalId}`
    );

    const proposalRows = await db.execute(
      sql`SELECT * FROM action_proposals WHERE id = ${proposalId} LIMIT 1`
    );
    const proposal = proposalRows.rows?.[0] as any;

    if (proposal?.chat_id) {
      broadcastProposalUpdate(proposal.chat_id, { ...proposal, status: "rejected" });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/proposals/:proposalId/execute", async (req: Request, res: Response) => {
  try {
    const proposalId = req.params.proposalId as string;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const proposalRows = await db.execute(
      sql`SELECT * FROM action_proposals WHERE id = ${proposalId} LIMIT 1`
    );
    const proposal = proposalRows.rows?.[0] as any;

    if (!proposal) return res.status(404).json({ error: "Proposal not found" });
    if (proposal.status !== "approved") {
      return res.status(400).json({ error: "Proposal must be approved before execution" });
    }

    const items = await db.select().from(actionProposalItems)
      .where(eq(actionProposalItems.proposalId, proposal.id));

    const results: any[] = [];
    for (const item of items) {
      try {
        const result = await executeProposalItem(item, proposal);
        await db.update(actionProposalItems)
          .set({ executedAt: new Date(), resultJson: result })
          .where(eq(actionProposalItems.id, item.id));
        results.push({ itemId: item.id, success: true, result });
      } catch (err: any) {
        results.push({ itemId: item.id, success: false, error: err.message });
      }
    }

    await db.execute(
      sql`UPDATE action_proposals SET status = 'executed', updated_at = NOW() WHERE id = ${proposal.id}`
    );

    if (proposal.chat_id) {
      broadcastProposalUpdate(proposal.chat_id, { ...proposal, status: "executed" });
    }

    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function executeProposalItem(item: any, proposal: any) {
  const payload = item.payloadJson as any;

  switch (item.actionType) {
    case "create_task": {
      const [task] = await db.insert(tasks).values({
        title: payload.title,
        description: payload.description || "",
        status: payload.status || "not-started",
        priority: payload.priority || "medium",
        dueDate: payload.dueDate || null,
        boardId: payload.boardId || proposal.scope_id,
        groupId: payload.groupId || null,
        assignees: payload.assignees || [],
      }).returning();
      return { taskId: task.id, title: task.title };
    }

    case "update_due_date": {
      await db.update(tasks)
        .set({ dueDate: payload.dueDate, updatedAt: new Date() })
        .where(eq(tasks.id, payload.taskId));
      return { taskId: payload.taskId, dueDate: payload.dueDate };
    }

    case "assign_user": {
      const [task] = await db.select().from(tasks)
        .where(eq(tasks.id, payload.taskId));
      if (task) {
        const currentAssignees = (task.assignees as any[]) || [];
        if (!currentAssignees.some((a: any) => a.id === payload.userId)) {
          currentAssignees.push({ id: payload.userId, name: payload.userName || "" });
          await db.update(tasks)
            .set({ assignees: currentAssignees, updatedAt: new Date() })
            .where(eq(tasks.id, payload.taskId));
        }
      }
      return { taskId: payload.taskId, userId: payload.userId };
    }

    default:
      return { skipped: true, reason: `Unknown action type: ${item.actionType}` };
  }
}

export default router;
