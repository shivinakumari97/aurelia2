import { z } from "zod";

/**
 * Centralized, validated environment access.
 *
 * Secrets are read from the process environment only (never committed).
 * In production every field below is required; in development we fall back to
 * clearly-marked dev defaults so the app boots without a full secret bundle.
 */
const isProd = process.env.NODE_ENV === "production";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .default("postgresql://aurelia:aurelia@localhost:5432/aurelia?schema=public"),
  // Signing key for short-lived JWT access tokens.
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  ACCESS_TOKEN_TTL: z.string().default("900"), // seconds (15 min)
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  // 32-byte key (base64 or hex) used for AES-256-GCM field encryption.
  FIELD_ENCRYPTION_KEY: z.string().optional(),
  // AI provider
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-opus-4-7"),
  // Stripe (billing) — optional until wired.
  STRIPE_SECRET_KEY: z.string().optional(),
  APP_URL: z.string().default("http://localhost:3000"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Fail loudly on misconfiguration rather than booting in a broken state.
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

const raw = parsed.data;

// Dev-only fallbacks for secrets. These are obviously insecure and only used
// when NODE_ENV !== production so contributors can run the app immediately.
const DEV_JWT_SECRET = "dev-only-insecure-access-secret-change-me-32b";
const DEV_FIELD_KEY = "ZGV2LWluc2VjdXJlLWZpZWxka2V5LTAxMjM0NTY3ODk="; // base64 of exactly 32 bytes

// `next build` imports route modules to collect metadata; secrets aren't
// needed then. Only enforce their presence on a running production server.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (isProd && !isBuildPhase) {
  const missing: string[] = [];
  if (!raw.JWT_ACCESS_SECRET) missing.push("JWT_ACCESS_SECRET");
  if (!raw.FIELD_ENCRYPTION_KEY) missing.push("FIELD_ENCRYPTION_KEY");
  if (missing.length) {
    throw new Error(`Missing required production secrets: ${missing.join(", ")}`);
  }
}

export const env = {
  ...raw,
  JWT_ACCESS_SECRET: raw.JWT_ACCESS_SECRET ?? DEV_JWT_SECRET,
  FIELD_ENCRYPTION_KEY: raw.FIELD_ENCRYPTION_KEY ?? DEV_FIELD_KEY,
  isProd,
  isDev: raw.NODE_ENV === "development",
  isTest: raw.NODE_ENV === "test",
  aiEnabled: Boolean(raw.ANTHROPIC_API_KEY),
};

export type Env = typeof env;
