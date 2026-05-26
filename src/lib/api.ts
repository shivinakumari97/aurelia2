import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { getAuthContext, type AuthContext } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/rbac";
import { rateLimit, clientKey, maybeSweep } from "@/lib/security/rate-limit";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function fail(message: string, status = 400, extra?: object): NextResponse {
  return NextResponse.json({ error: { message, ...extra } }, { status });
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Translate thrown errors into consistent JSON responses. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof ForbiddenError) return fail(err.message, 403);
  if (err instanceof ApiError) return fail(err.message, err.status);
  if (err instanceof ZodError) {
    return fail("Validation failed", 422, { issues: err.flatten().fieldErrors });
  }
  console.error("[api] unhandled error", err);
  return fail("Internal server error", 500);
}

/** Require an authenticated principal; throws 401 otherwise. */
export async function requireAuth(req: NextRequest): Promise<AuthContext> {
  const ctx = await getAuthContext(req);
  if (!ctx) throw new ApiError(401, "Authentication required");
  return ctx;
}

/** Parse + validate a JSON body against a zod schema. */
export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  return schema.parse(json);
}

/** Apply a rate limit, throwing 429 when exceeded. */
export function enforceRateLimit(
  req: NextRequest,
  scope: string,
  opts: { limit: number; windowMs: number },
): void {
  maybeSweep();
  const result = rateLimit(clientKey(req, scope), opts);
  if (!result.ok) {
    throw new ApiError(429, "Too many requests. Please slow down.");
  }
}

export function getIp(req: NextRequest): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
