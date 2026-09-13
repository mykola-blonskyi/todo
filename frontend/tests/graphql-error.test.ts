import { describe, expect, it } from 'vitest';
import { GraphQLRequestError, isMissing } from '@shared/lib/graphql-client';

function error(code?: string) {
  return new GraphQLRequestError([{ message: 'nope', extensions: { code } }]);
}

// The detail pages call notFound() on this. Every GraphQL failure used to
// qualify, so a backend restart told a user their own list did not exist.
describe('isMissing', () => {
  it.each(['NOT_FOUND', 'FORBIDDEN'])('is true for %s', (code) => {
    expect(isMissing(error(code))).toBe(true);
  });

  it.each(['INTERNAL_SERVER_ERROR', 'UNAUTHENTICATED', 'CONFLICT', undefined])(
    'is false for %s',
    (code) => {
      expect(isMissing(error(code))).toBe(false);
    },
  );

  it('is false for a network failure, which is not a GraphQL error at all', () => {
    expect(isMissing(new TypeError('fetch failed'))).toBe(false);
  });
});
