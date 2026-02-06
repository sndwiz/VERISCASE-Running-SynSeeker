export interface SynSeekrConfig {
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  lastChecked?: string;
  lastStatus?: "online" | "offline" | "error";
  lastLatencyMs?: number;
}

export interface SynSeekrHealthResponse {
  status: "online" | "offline" | "error";
  latencyMs: number;
  version?: string;
  services?: Record<string, string>;
  timestamp: string;
}

export interface SynSeekrProxyResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
}

const DEFAULT_TIMEOUT = 15000;

class SynSeekrClient {
  private config: SynSeekrConfig = {
    baseUrl: "",
    apiKey: "",
    enabled: false,
  };

  getConfig(): SynSeekrConfig {
    return { ...this.config, apiKey: this.config.apiKey ? "••••••••" : "" };
  }

  getFullConfig(): SynSeekrConfig {
    return { ...this.config };
  }

  updateConfig(update: Partial<SynSeekrConfig>): SynSeekrConfig {
    if (update.baseUrl !== undefined) {
      this.config.baseUrl = update.baseUrl.replace(/\/+$/, "");
    }
    if (update.apiKey !== undefined) {
      this.config.apiKey = update.apiKey;
    }
    if (update.enabled !== undefined) {
      this.config.enabled = update.enabled;
    }
    return this.getConfig();
  }

  isConfigured(): boolean {
    return !!(this.config.baseUrl && this.config.apiKey);
  }

  isEnabled(): boolean {
    return this.config.enabled && this.isConfigured();
  }

  async checkHealth(): Promise<SynSeekrHealthResponse> {
    if (!this.isConfigured()) {
      return {
        status: "offline",
        latencyMs: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: "GET",
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        this.config.lastStatus = "error";
        this.config.lastChecked = new Date().toISOString();
        this.config.lastLatencyMs = latencyMs;
        return {
          status: "error",
          latencyMs,
          timestamp: new Date().toISOString(),
        };
      }

      let data: any = {};
      try {
        data = await response.json();
      } catch {}

      this.config.lastStatus = "online";
      this.config.lastChecked = new Date().toISOString();
      this.config.lastLatencyMs = latencyMs;

      return {
        status: "online",
        latencyMs,
        version: data.version,
        services: data.services,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const latencyMs = Date.now() - start;
      this.config.lastStatus = "offline";
      this.config.lastChecked = new Date().toISOString();
      this.config.lastLatencyMs = latencyMs;

      return {
        status: "offline",
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async proxy(
    method: string,
    path: string,
    body?: any,
    timeout = DEFAULT_TIMEOUT
  ): Promise<SynSeekrProxyResponse> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: "SynSeekr is not configured or not enabled",
        statusCode: 503,
      };
    }

    const url = `${this.config.baseUrl}${path}`;

    try {
      const options: RequestInit = {
        method,
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(timeout),
      };

      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      let data: any;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        success: response.ok,
        data,
        statusCode: response.status,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      return {
        success: false,
        error: message,
        statusCode: 0,
      };
    }
  }

  async getCases(): Promise<SynSeekrProxyResponse> {
    return this.proxy("GET", "/cases");
  }

  async getCase(caseId: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("GET", `/cases/${caseId}`);
  }

  async uploadDocument(caseId: string, formData: any): Promise<SynSeekrProxyResponse> {
    return this.proxy("POST", `/upload-document`, { case_id: caseId, ...formData });
  }

  async analyzeDocument(documentId: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("POST", `/analysis/queue`, { document_id: documentId });
  }

  async getDocumentAnalysis(documentId: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("GET", `/documents/${documentId}/full-analysis`);
  }

  async ragQuery(query: string, caseId?: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("POST", "/rag-query", { query, case_id: caseId }, 30000);
  }

  async legalQuery(query: string, caseId?: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("POST", "/legal-query", { query, case_id: caseId }, 30000);
  }

  async extractEntities(caseId: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("GET", `/cases/${caseId}/entities`);
  }

  async runInvestigation(caseId: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("POST", `/investigation/${caseId}/run`, {}, 60000);
  }

  async detectContradictions(caseId: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("POST", `/investigation/${caseId}/detect-contradictions`, {}, 30000);
  }

  async classifyDocument(documentId: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("GET", `/documents/${documentId}/type`);
  }

  async getTimelineEvents(caseId: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("GET", `/timeline/${caseId}/events`);
  }

  async searchDocuments(query: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("GET", `/search-documents?query=${encodeURIComponent(query)}`);
  }

  async runAgent(agentName: string, caseId: string): Promise<SynSeekrProxyResponse> {
    return this.proxy("POST", `/agents/run/${agentName}/${caseId}`, {}, 60000);
  }

  async getSystemMetrics(): Promise<SynSeekrProxyResponse> {
    return this.proxy("GET", "/system/metrics");
  }

  async getGPUStatus(): Promise<SynSeekrProxyResponse> {
    return this.proxy("GET", "/system/gpu-scheduler");
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      headers["X-API-Key"] = this.config.apiKey;
    }

    headers["X-Client"] = "VERICASE";

    return headers;
  }
}

export const synseekrClient = new SynSeekrClient();
