import { Router, Request, Response } from 'express';
import { clawbotService } from '../services/clawbot';
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { authStorage } from "../replit_integrations/auth/storage";

const router = Router();

// Allowed gateway URL patterns (local networks and known Clawbot domains)
const ALLOWED_GATEWAY_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?/,
  /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?/,
  /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?/,
  /^https?:\/\/.*\.clawd\.bot/,
  /^https?:\/\/.*\.clawbot\.(ai|io)/,
  /^https?:\/\/.*\.openclaw\.ai/
];

function isValidGatewayUrl(url: string): boolean {
  try {
    new URL(url);
    return ALLOWED_GATEWAY_PATTERNS.some(pattern => pattern.test(url));
  } catch {
    return false;
  }
}

async function isAdmin(req: Request): Promise<boolean> {
  const user = (req as any).user;
  if (!user?.id) return false;
  
  try {
    const dbUser = await authStorage.getUser(user.id);
    return dbUser?.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Get Clawbot gateway status and configuration
 */
router.get('/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const status = await clawbotService.checkStatus();
    const config = clawbotService.getConfig();
    
    res.json({
      ...status,
      ...config
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to check gateway status',
      message: error.message
    });
  }
});

/**
 * Update gateway configuration (admin only)
 */
router.post('/config', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check admin role
    const adminCheck = await isAdmin(req);
    if (!adminCheck) {
      return res.status(403).json({ error: 'Only administrators can configure the gateway' });
    }
    
    const { gatewayUrl, authToken } = req.body;
    
    if (!gatewayUrl || typeof gatewayUrl !== 'string') {
      return res.status(400).json({ error: 'Gateway URL is required' });
    }
    
    // Validate gateway URL to prevent SSRF
    if (!isValidGatewayUrl(gatewayUrl)) {
      return res.status(400).json({ 
        error: 'Invalid gateway URL',
        message: 'Gateway URL must be a local network address or an official Clawbot domain'
      });
    }
    
    // Validate auth token if provided
    if (authToken !== undefined && typeof authToken !== 'string') {
      return res.status(400).json({ error: 'Auth token must be a string' });
    }
    
    clawbotService.updateConfig(gatewayUrl, authToken);
    
    // Test the new connection
    const status = await clawbotService.checkStatus();
    
    res.json({
      success: true,
      message: 'Configuration updated',
      status
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update configuration',
      message: error.message
    });
  }
});

/**
 * Create a new Clawbot session
 */
router.post('/sessions', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const session = await clawbotService.createSession(userId);
    
    if (!session) {
      return res.status(500).json({ error: 'Failed to create session' });
    }
    
    res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        createdAt: session.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to create session',
      message: error.message
    });
  }
});

/**
 * Send a message to Clawbot
 */
router.post('/sessions/:sessionId/messages', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }
    
    // Limit message length to prevent abuse
    if (message.length > 10000) {
      return res.status(400).json({ error: 'Message too long (max 10000 characters)' });
    }
    
    const result = await clawbotService.sendMessage(sessionId, message);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to send message',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      response: result.response
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message
    });
  }
});

/**
 * Get session history
 */
router.get('/sessions/:sessionId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    const session = clawbotService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      session: {
        id: session.id,
        status: session.status,
        createdAt: session.createdAt,
        messages: session.messages
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get session',
      message: error.message
    });
  }
});

/**
 * List user sessions
 */
router.get('/sessions', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const sessions = clawbotService.getUserSessions(userId);
    
    res.json({
      sessions: sessions.map(s => ({
        id: s.id,
        status: s.status,
        createdAt: s.createdAt,
        messageCount: s.messages.length
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to list sessions',
      message: error.message
    });
  }
});

/**
 * Close a session
 */
router.delete('/sessions/:sessionId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    const success = await clawbotService.closeSession(sessionId);
    
    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to close session',
      message: error.message
    });
  }
});

export default router;
