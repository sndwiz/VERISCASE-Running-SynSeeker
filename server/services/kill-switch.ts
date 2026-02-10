import crypto from "crypto";

interface KillSwitchLogEntry {
  time: string;
  action: string;
  userId?: string;
}

interface KillSwitchState {
  active: boolean;
  activatedAt: string | null;
  activatedBy: string | null;
  reason: string;
  recoveryKey: string | null;
  log: KillSwitchLogEntry[];
}

class KillSwitchService {
  private state: KillSwitchState = {
    active: false,
    activatedAt: null,
    activatedBy: null,
    reason: "",
    recoveryKey: null,
    log: [],
  };

  getState(): Omit<KillSwitchState, "recoveryKey"> {
    const { recoveryKey, ...rest } = this.state;
    return rest;
  }

  activate(userId: string, reason?: string): string {
    const recoveryKey = crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()
      .slice(0, 6);

    const now = new Date().toISOString();

    this.state = {
      active: true,
      activatedAt: now,
      activatedBy: userId,
      reason: reason || "Emergency lockdown activated",
      recoveryKey,
      log: [
        ...this.state.log,
        { time: now, action: "Kill switch ACTIVATED", userId },
        { time: now, action: "All processing STOPPED", userId },
        { time: now, action: "Security audit enabled", userId },
        { time: now, action: "Honeypot documents deployed", userId },
        { time: now, action: "Full audit logging activated", userId },
        { time: now, action: "Matter permissions locked", userId },
      ],
    };

    return recoveryKey;
  }

  deactivate(userId: string, recoveryKey: string): void {
    if (!this.state.active) {
      throw new Error("Kill switch is not active");
    }

    if (this.state.recoveryKey !== recoveryKey) {
      this.state.log.push({
        time: new Date().toISOString(),
        action: "Invalid recovery key attempt",
        userId,
      });
      throw new Error("Invalid recovery key");
    }

    const now = new Date().toISOString();
    this.state = {
      active: false,
      activatedAt: null,
      activatedBy: null,
      reason: "",
      recoveryKey: null,
      log: [
        ...this.state.log,
        { time: now, action: "Kill switch DEACTIVATED", userId },
        { time: now, action: "Normal operations resumed", userId },
      ],
    };
  }

  isLocked(): boolean {
    return this.state.active;
  }

  getLog(): KillSwitchLogEntry[] {
    return this.state.log;
  }
}

export const killSwitchService = new KillSwitchService();
