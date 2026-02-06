import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import type { Express, Request, Response, NextFunction } from "express";
import { getClientIp, logSecurityEvent } from "./audit";

const SCANNER_TRAP_PATHS = [
  "/wp-admin",
  "/wp-login.php",
  "/wp-content",
  "/wp-includes",
  "/wp-json",
  "/xmlrpc.php",
  "/.env",
  "/.git",
  "/.svn",
  "/.htaccess",
  "/.htpasswd",
  "/phpmyadmin",
  "/pma",
  "/myadmin",
  "/vendor/phpunit",
  "/vendor/composer",
  "/config.php",
  "/wp-config.php",
  "/administrator",
  "/admin.php",
  "/shell",
  "/cmd",
  "/cgi-bin",
  "/etc/passwd",
  "/etc/shadow",
  "/proc/self",
  "/.aws",
  "/.docker",
  "/actuator",
  "/debug",
  "/telescope",
  "/elmah.axd",
  "/server-status",
  "/server-info",
  "/phpinfo.php",
  "/info.php",
  "/test.php",
  "/backup",
  "/.backup",
  "/db.sql",
  "/dump.sql",
  "/.DS_Store",
  "/Thumbs.db",
];

function scannerTrapMiddleware(req: Request, res: Response, next: NextFunction): void {
  const path = req.path.toLowerCase();

  const isScanner = SCANNER_TRAP_PATHS.some((trap) => path.startsWith(trap));

  if (isScanner) {
    logSecurityEvent("scanner_tripwire", req, {
      path: req.path,
      method: req.method,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] || "",
    }, "warning");

    res.status(404).json({ error: "Not found" });
    return;
  }

  next();
}

export const formSubmissionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many form submissions, please try again later." },
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    logSecurityEvent("rate_limit_form_submission", req, {
      path: req.path,
      limit: 10,
      window: "10 minutes",
      ip: getClientIp(req),
    }, "warning");
    res.status(429).json({ error: "Too many form submissions, please try again later." });
  },
});

export const contactFormLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many contact requests, please try again later." },
  keyGenerator: (req) => getClientIp(req),
  handler: (req, res) => {
    logSecurityEvent("rate_limit_contact_form", req, {
      path: req.path,
      limit: 5,
      window: "10 minutes",
      ip: getClientIp(req),
    }, "warning");
    res.status(429).json({ error: "Too many contact requests, please try again later." });
  },
});

export async function verifyTurnstileToken(token: string, ip: string): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "Missing verification token" };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const data = await resp.json() as { success: boolean; "error-codes"?: string[] };
    if (!data.success) {
      return { success: false, error: `Turnstile verification failed: ${(data["error-codes"] || []).join(", ")}` };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Verification service unavailable" };
  }
}

export function setupSecurityMiddleware(app: Express): void {
  app.set("trust proxy", 1);

  app.use(scannerTrapMiddleware);

  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || "";
  const cspScriptSrc: string[] = ["'self'", "'unsafe-inline'", "'unsafe-eval'"];
  const cspConnectSrc: string[] = ["'self'", "https:", "wss:"];
  const cspFrameSrc: string[] = ["'none'"];

  if (turnstileSiteKey) {
    cspScriptSrc.push("https://challenges.cloudflare.com");
    cspConnectSrc.push("https://challenges.cloudflare.com");
    cspFrameSrc.push("https://challenges.cloudflare.com");
  }

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: cspScriptSrc,
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: cspConnectSrc,
        frameSrc: cspFrameSrc,
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xContentTypeOptions: true,
    xDnsPrefetchControl: { allow: false },
    xDownloadOptions: true,
    xFrameOptions: { action: "deny" },
    xPermittedCrossDomainPolicies: { permittedPolicies: "none" },
    xPoweredBy: false,
    xXssProtection: true,
  }));

  const allowedOrigins: (RegExp | string)[] = [
    /\.replit\.dev$/,
    /\.repl\.co$/,
    /\.replit\.app$/,
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  ];

  if (process.env.APP_DOMAIN) {
    const domain = process.env.APP_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
    allowedOrigins.push(new RegExp(`^https?://(www\\.)?${domain.replace(/\./g, "\\.")}$`));
  }

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((pattern) =>
        typeof pattern === "string" ? pattern === origin : pattern.test(origin)
      )) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400,
  }));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    skip: (req) => {
      return req.path === "/api/health" || !req.path.startsWith("/api");
    },
    keyGenerator: (req) => getClientIp(req),
  });
  app.use(globalLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts, please try again in 15 minutes." },
    keyGenerator: (req) => getClientIp(req),
    handler: (req, res) => {
      logSecurityEvent("rate_limit_exceeded", req, {
        path: req.path,
        limit: 20,
        window: "15 minutes",
      }, "warning");
      res.status(429).json({ error: "Too many login attempts, please try again in 15 minutes." });
    },
  });
  app.use("/api/login", authLimiter);
  app.use("/api/callback", authLimiter);

  const sensitiveLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Rate limit exceeded for this resource." },
    keyGenerator: (req) => getClientIp(req),
  });
  app.use("/api/evidence", sensitiveLimiter);
  app.use("/api/documents", sensitiveLimiter);
  app.use("/api/ai", sensitiveLimiter);

  app.use(sanitizeInputMiddleware);
}

function sanitizeInputMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = deepSanitize(req.body);
  }
  next();
}

function deepSanitize(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSanitize);
  }
  if (obj !== null && typeof obj === "object") {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = deepSanitize(value);
    }
    return sanitized;
  }
  return obj;
}

function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/data:text\/html/gi, "");
}
