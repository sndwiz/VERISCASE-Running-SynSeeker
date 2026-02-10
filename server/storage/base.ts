import { db } from "../db";

export { db };

export function toISOString(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}
