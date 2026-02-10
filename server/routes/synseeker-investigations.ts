import { Router, type Express, type Request, type Response } from 'express';
import { db } from '../db';
import {
  investigations,
  investigationFindings,
  discoveredEntities,
  entityConnections,
} from '../../shared/models/tables';
import { createInvestigationSchema, updateFindingSchema } from '@shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { InvestigationEngine } from '../services/investigation-engine';
import { getAllTemplates } from '../services/investigation-templates';

const router = Router();

function isValidId(str: string): boolean {
  return typeof str === 'string' && str.length > 0 && str.length <= 100;
}

router.get('/api/investigations', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;
    const matterId = req.query.matterId as string;

    const conditions = [];
    if (status) {
      conditions.push(eq(investigations.status, status as any));
    }
    if (matterId && isValidId(matterId)) {
      conditions.push(eq(investigations.matterId, matterId));
    }

    const results = await db
      .select()
      .from(investigations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(investigations.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(investigations)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({
      data: results,
      pagination: { total: count, limit, offset },
    });
  } catch (err: any) {
    console.error('GET /api/investigations error:', err);
    res.status(500).json({ error: 'Failed to fetch investigations' });
  }
});

router.get('/api/investigations/templates', (_req: Request, res: Response) => {
  res.json(getAllTemplates());
});

router.get('/api/investigations/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid investigation ID' });

    const [investigation] = await db
      .select()
      .from(investigations)
      .where(eq(investigations.id, id));

    if (!investigation) return res.status(404).json({ error: 'Investigation not found' });

    const [invFindings, entities, connections] = await Promise.all([
      db.select().from(investigationFindings)
        .where(eq(investigationFindings.investigationId, id))
        .orderBy(desc(investigationFindings.createdAt)),
      db.select().from(discoveredEntities)
        .where(eq(discoveredEntities.investigationId, id)),
      db.select().from(entityConnections)
        .where(eq(entityConnections.investigationId, id)),
    ]);

    res.json({
      ...investigation,
      findings: invFindings,
      entities,
      connections,
    });
  } catch (err: any) {
    console.error('GET /api/investigations/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch investigation' });
  }
});

router.post('/api/investigations', async (req: Request, res: Response) => {
  try {
    const parsed = createInvestigationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { targetName, targetDomain, targetAddress, targetState, matterId, sources, templateId } = parsed.data;

    const cleanDomain = targetDomain
      ? targetDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      : null;

    const [investigation] = await db
      .insert(investigations)
      .values({
        targetName: targetName.trim(),
        targetDomain: cleanDomain,
        targetAddress: targetAddress?.trim() || null,
        targetState: targetState?.toUpperCase() || 'UT',
        matterId: matterId || null,
        sources: sources || ['web', 'corp', 'domain', 'legal', 'npi', 'reviews', 'social', 'news'],
        templateId: templateId || 'custom',
        status: 'scanning',
        progress: 0,
      })
      .returning();

    const engine = new InvestigationEngine(investigation.id);
    engine.run().catch((err) => {
      console.error(`[SynSeeker] Investigation ${investigation.id} failed:`, err.message);
      db.update(investigations)
        .set({ status: 'failed' })
        .where(eq(investigations.id, investigation.id))
        .catch(console.error);
    });

    res.status(201).json(investigation);
  } catch (err: any) {
    console.error('POST /api/investigations error:', err);
    res.status(500).json({ error: 'Failed to create investigation' });
  }
});

router.get('/api/investigations/:id/stream', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid investigation ID' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let lastProgress = -1;
  let lastLogCount = 0;

  const interval = setInterval(async () => {
    try {
      const [inv] = await db
        .select()
        .from(investigations)
        .where(eq(investigations.id, id));

      if (!inv) {
        res.write(`data: ${JSON.stringify({ error: 'Investigation not found' })}\n\n`);
        clearInterval(interval);
        res.end();
        return;
      }

      const scanLog = (inv.scanLog as any[]) || [];

      if (inv.progress !== lastProgress || scanLog.length !== lastLogCount) {
        lastProgress = inv.progress;
        lastLogCount = scanLog.length;

        res.write(
          `data: ${JSON.stringify({
            status: inv.status,
            progress: inv.progress,
            scanLog: scanLog.slice(-20),
            totalFindings: inv.totalFindings,
            criticalFlags: inv.criticalFlags,
            entityCount: inv.entityCount,
            connectionCount: inv.connectionCount,
            aiRiskScore: inv.aiRiskScore,
          })}\n\n`
        );
      }

      if (inv.status === 'complete' || inv.status === 'failed') {
        res.write(
          `data: ${JSON.stringify({
            status: inv.status,
            progress: inv.progress,
            done: true,
          })}\n\n`
        );
        clearInterval(interval);
        res.end();
      }
    } catch (err) {
      console.error('[SSE] Poll error:', err);
    }
  }, 800);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

router.delete('/api/investigations/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid investigation ID' });

    const [updated] = await db
      .update(investigations)
      .set({ status: 'archived' })
      .where(eq(investigations.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Investigation not found' });
    res.json(updated);
  } catch (err: any) {
    console.error('DELETE /api/investigations/:id error:', err);
    res.status(500).json({ error: 'Failed to archive investigation' });
  }
});

router.patch('/api/investigation-findings/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const parsed = updateFindingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { starred, dismissed, userNotes } = parsed.data;

    const updateData: Record<string, boolean | string> = {};
    if (typeof starred === 'boolean') updateData.starred = starred;
    if (typeof dismissed === 'boolean') updateData.dismissed = dismissed;
    if (typeof userNotes === 'string') updateData.userNotes = userNotes;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const [updated] = await db
      .update(investigationFindings)
      .set(updateData)
      .where(eq(investigationFindings.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Finding not found' });
    res.json(updated);
  } catch (err: any) {
    console.error('PATCH /api/investigation-findings/:id error:', err);
    res.status(500).json({ error: 'Failed to update finding' });
  }
});

router.get('/api/investigations/:id/findings', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid investigation ID' });

    const severity = req.query.severity as string;
    const showDismissed = req.query.showDismissed === 'true';

    const conditions = [eq(investigationFindings.investigationId, id)];
    if (severity) {
      conditions.push(eq(investigationFindings.severity, severity as any));
    }
    if (!showDismissed) {
      conditions.push(eq(investigationFindings.dismissed, false));
    }

    const result = await db
      .select()
      .from(investigationFindings)
      .where(and(...conditions))
      .orderBy(desc(investigationFindings.createdAt));

    res.json(result);
  } catch (err: any) {
    console.error('GET /api/investigations/:id/findings error:', err);
    res.status(500).json({ error: 'Failed to fetch findings' });
  }
});

router.get('/api/investigations/:id/entities', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid investigation ID' });

    const result = await db
      .select()
      .from(discoveredEntities)
      .where(eq(discoveredEntities.investigationId, id));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

router.get('/api/investigations/:id/connections', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid investigation ID' });

    const result = await db
      .select()
      .from(entityConnections)
      .where(eq(entityConnections.investigationId, id));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

router.post('/api/investigations/:id/link-matter', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { matterId } = req.body;

    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid investigation ID' });
    if (!matterId || !isValidId(matterId)) {
      return res.status(400).json({ error: 'Valid matterId is required' });
    }

    const [updated] = await db
      .update(investigations)
      .set({ matterId })
      .where(eq(investigations.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Investigation not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to link matter' });
  }
});

export function registerSynSeekerInvestigationRoutes(app: Express): void {
  app.use(router);
}
