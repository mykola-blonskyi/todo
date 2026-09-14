import { validateEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  HUB_URL: 'https://hub.example.test',
  PROJECT_SLUG: 'todo',
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  TOKEN_ENCRYPTION_KEY: 'y6pTgWQY7Sl4qAIAYKKubuJjYOXMxr0yfPWWBHNCsRQ=',
};

describe('validateEnv', () => {
  it('accepts a complete environment', () => {
    expect(() => validateEnv(valid)).not.toThrow();
  });

  it.each(Object.keys(valid))('rejects a missing %s', (key) => {
    const rest: Record<string, unknown> = { ...valid };
    delete rest[key];

    expect(() => validateEnv(rest)).toThrow(key);
  });

  it('rejects an encryption key that decodes to the wrong length', () => {
    expect(() =>
      validateEnv({
        ...valid,
        TOKEN_ENCRYPTION_KEY: 'dGVzdC1rZXktMzItYnl0ZXMtbG9uZy1mb3ItYWVzMjU2',
      }),
    ).toThrow('32 bytes');
  });

  it('rejects a HUB_URL that is not a URL', () => {
    expect(() =>
      validateEnv({ ...valid, HUB_URL: 'hub.example.test' }),
    ).toThrow('HUB_URL');
  });

  it('leaves variables it does not own alone', () => {
    const result = validateEnv({ ...valid, UNRELATED: 'kept' });

    expect(result.UNRELATED).toBe('kept');
  });
});
