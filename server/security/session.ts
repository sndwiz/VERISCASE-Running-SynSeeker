import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getClientIp, logSecurityEvent } from "./audit";

export const sessionIpTracking: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.session) {
    return next();
  }

  const currentIp = getClientIp(req);
  const session = req.session as any;

  if (!session.initialIp) {
    session.initialIp = currentIp;
    session.lastIp = currentIp;
    session.ipHistory = [{ ip: currentIp, timestamp: new Date().toISOString() }];
    session.lastActivity = new Date().toISOString();
    return next();
  }

  session.lastActivity = new Date().toISOString();

  if (session.lastIp !== currentIp) {
    const history = session.ipHistory || [];
    history.push({ ip: currentIp, timestamp: new Date().toISOString() });
    if (history.length > 10) history.shift();
    session.ipHistory = history;

    logSecurityEvent("session_ip_change", req, {
      previousIp: session.lastIp,
      newIp: currentIp,
      userId: (req.user as any)?.claims?.sub,
    }, "warning");

    session.lastIp = currentIp;
  }

  next();
};

export function getSessionInfo(req: Request): {
  initialIp: string | null;
  lastIp: string | null;
  lastActivity: string | null;
  ipHistory: Array<{ ip: string; timestamp: string }>;
} {
  const session = req.session as any;
  return {
    initialIp: session?.initialIp || null,
    lastIp: session?.lastIp || null,
    lastActivity: session?.lastActivity || null,
    ipHistory: session?.ipHistory || [],
  };
}
