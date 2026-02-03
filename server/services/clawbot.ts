/**
 * Clawbot/OpenClaw Gateway Integration Service
 * Connects VERICASE to a self-hosted OpenClaw gateway for AI-powered computer control
 */

interface ClawbotMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ClawbotSession {
  id: string;
  status: 'active' | 'idle' | 'closed';
  createdAt: Date;
  messages: ClawbotMessage[];
}

interface ClawbotStatus {
  connected: boolean;
  gatewayUrl: string | null;
  version?: string;
  uptime?: number;
  activeSessionCount?: number;
  error?: string;
}

interface ClawbotSendResult {
  success: boolean;
  message?: string;
  response?: string;
  error?: string;
}

class ClawbotService {
  private gatewayUrl: string | null = null;
  private authToken: string | null = null;
  private sessions: Map<string, ClawbotSession> = new Map();

  constructor() {
    this.gatewayUrl = process.env.CLAWBOT_GATEWAY_URL || null;
    this.authToken = process.env.CLAWBOT_GATEWAY_TOKEN || null;
  }

  /**
   * Check if Clawbot gateway is configured
   */
  isConfigured(): boolean {
    return !!this.gatewayUrl;
  }

  /**
   * Get gateway configuration
   */
  getConfig() {
    return {
      gatewayUrl: this.gatewayUrl,
      isConfigured: this.isConfigured(),
      hasAuthToken: !!this.authToken
    };
  }

  /**
   * Update gateway configuration at runtime
   */
  updateConfig(gatewayUrl: string, authToken?: string) {
    this.gatewayUrl = gatewayUrl;
    if (authToken) {
      this.authToken = authToken;
    }
  }

  /**
   * Check gateway connection status
   */
  async checkStatus(): Promise<ClawbotStatus> {
    if (!this.gatewayUrl) {
      return {
        connected: false,
        gatewayUrl: null,
        error: 'Gateway URL not configured'
      };
    }

    try {
      const response = await fetch(`${this.gatewayUrl}/api/status`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return {
          connected: false,
          gatewayUrl: this.gatewayUrl,
          error: `Gateway returned ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        connected: true,
        gatewayUrl: this.gatewayUrl,
        version: data.version,
        uptime: data.uptime,
        activeSessionCount: data.sessions?.length || 0
      };
    } catch (error: any) {
      return {
        connected: false,
        gatewayUrl: this.gatewayUrl,
        error: error.message || 'Failed to connect to gateway'
      };
    }
  }

  /**
   * Get authorization headers for gateway requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  /**
   * Create a new session with Clawbot
   */
  async createSession(userId: string): Promise<ClawbotSession | null> {
    const sessionId = `vericase-${userId}-${Date.now()}`;
    
    if (!this.gatewayUrl) {
      // Create a local session for when gateway is not connected
      const session: ClawbotSession = {
        id: sessionId,
        status: 'active',
        createdAt: new Date(),
        messages: []
      };
      this.sessions.set(sessionId, session);
      return session;
    }

    try {
      const response = await fetch(`${this.gatewayUrl}/api/sessions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          sessionId,
          context: {
            source: 'vericase',
            userId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const data = await response.json();
      const session: ClawbotSession = {
        id: data.sessionId || sessionId,
        status: 'active',
        createdAt: new Date(),
        messages: []
      };
      this.sessions.set(session.id, session);
      return session;
    } catch (error) {
      // Fallback to local session
      const session: ClawbotSession = {
        id: sessionId,
        status: 'active',
        createdAt: new Date(),
        messages: []
      };
      this.sessions.set(sessionId, session);
      return session;
    }
  }

  /**
   * Send a message to Clawbot gateway
   */
  async sendMessage(sessionId: string, message: string): Promise<ClawbotSendResult> {
    const session = this.sessions.get(sessionId);
    
    // Add user message to session
    const userMessage: ClawbotMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    if (session) {
      session.messages.push(userMessage);
    }

    if (!this.gatewayUrl) {
      // Simulate response when gateway is not connected
      const assistantMessage: ClawbotMessage = {
        role: 'assistant',
        content: `[Clawbot Gateway Not Connected]\n\nI received your message: "${message}"\n\nTo enable full Clawbot functionality, please configure the gateway connection:\n\n1. Set CLAWBOT_GATEWAY_URL environment variable to your gateway address (e.g., http://localhost:18789)\n2. Set CLAWBOT_GATEWAY_TOKEN for authentication\n\nOnce connected, I'll be able to execute commands, browse the web, and perform tasks on your system.`,
        timestamp: new Date()
      };
      
      if (session) {
        session.messages.push(assistantMessage);
      }
      
      return {
        success: true,
        response: assistantMessage.content
      };
    }

    try {
      const response = await fetch(`${this.gatewayUrl}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          content: message,
          source: 'vericase'
        })
      });

      if (!response.ok) {
        throw new Error(`Gateway error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const assistantMessage: ClawbotMessage = {
        role: 'assistant',
        content: data.response || data.content || 'Response received',
        timestamp: new Date()
      };
      
      if (session) {
        session.messages.push(assistantMessage);
      }

      return {
        success: true,
        response: assistantMessage.content
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send message to gateway'
      };
    }
  }

  /**
   * Get session history
   */
  getSession(sessionId: string): ClawbotSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * List all sessions for a user
   */
  getUserSessions(userId: string): ClawbotSession[] {
    const userSessions: ClawbotSession[] = [];
    this.sessions.forEach((session) => {
      if (session.id.includes(userId)) {
        userSessions.push(session);
      }
    });
    return userSessions;
  }

  /**
   * Close a session
   */
  async closeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'closed';

    if (this.gatewayUrl) {
      try {
        await fetch(`${this.gatewayUrl}/api/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: this.getHeaders()
        });
      } catch (error) {
        // Session closed locally even if gateway fails
      }
    }

    return true;
  }
}

// Singleton instance
export const clawbotService = new ClawbotService();
