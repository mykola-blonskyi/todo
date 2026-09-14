import z from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  HUB_URL: z.url(),
  PROJECT_SLUG: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
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
