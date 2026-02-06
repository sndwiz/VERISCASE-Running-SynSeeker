import type { Request } from "express";

export function getUserId(req: Request): string | null {
  const user = (req as any).user;
  if (!user) return null;
  return user.id || user.claims?.sub || null;
}

export function getUserInfo(req: Request): { id: string; firstName?: string; lastName?: string; profileImageUrl?: string } | null {
  const user = (req as any).user;
  if (!user) return null;
  const id = user.id || user.claims?.sub;
  if (!id) return null;
  return {
    id,
    firstName: user.firstName || user.claims?.first_name,
    lastName: user.lastName || user.claims?.last_name,
    profileImageUrl: user.profileImageUrl || user.claims?.profile_image_url,
  };
}
