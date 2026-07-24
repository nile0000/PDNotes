import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

const jwks = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));
const issuer = `${env.SUPABASE_URL}/auth/v1`;

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: "authenticated",
    });

    if (typeof payload.sub !== "string") {
      res.status(401).json({ error: "Token missing subject" });
      return;
    }

    req.user = {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
    };

    // RLS-scoped client: every query below runs as this user via PostgREST,
    // so Postgres row level security is the real authorization boundary.
    req.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
