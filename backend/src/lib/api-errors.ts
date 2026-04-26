import type { Response } from "express";

export function jsonError(res: Response, message: string, status: number) {
  return res.status(status).json({ error: message });
}
