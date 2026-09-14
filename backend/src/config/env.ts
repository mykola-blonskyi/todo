import z from 'zod';

// Every variable the backend reads, checked once at boot rather than lazily at
// the first request that happens to need one.
//
// Without this, a typo in Coolify's environment panel produced a container
// that started, a healthcheck that went green and a deploy that reported
// success - and surfaced days later as a 500 the first time someone clicked
// Connect Google Calendar. docker-compose.yml's `${VAR:?}` catches a variable
// that is missing entirely; this catches one that is present and wrong.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  HUB_URL: z.url(),
  PROJECT_SLUG: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  // The one value whose shape matters rather than its presence: AES-256-GCM
  // needs exactly 32 bytes, and token-encryption.ts only found out on the
  // first encrypt, which is long after the deploy that broke it.
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((value) => Buffer.from(value, 'base64').length === 32, {
      message: 'must be base64 that decodes to 32 bytes',
    }),
  PORT: z.coerce.number().int().positive().optional(),
});

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${problems}`);
  }

  return { ...config, ...result.data };
}
