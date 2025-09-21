import { NextFunction, Request, Response } from "express";
import { verifyApiKeyHeader } from "../services/apiKey.service.js";
import { Role } from "../schemas/apiKey.schema.js";

const PUBLIC_WHITELIST = ["/health"];

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_WHITELIST.includes(req.path)) return next();

  const apiKey = req.header("x-api-key");
  const auth = await verifyApiKeyHeader(apiKey || "");
  if (!auth) return res.status(401).json({ error: "Invalid or missing API key" });

  (req as any).auth = { type: "apiKey", ...auth };
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role: Role | undefined = (req as any).auth?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
