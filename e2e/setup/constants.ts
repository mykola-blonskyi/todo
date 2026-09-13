export const FRONTEND_URL = 'http://localhost:3000';
export const BACKEND_URL = 'http://localhost:4000';

export const DATABASE_URL =
  'postgresql://todolist_test:todolist_test@localhost:5436/todolist_test';

// Not a real secret - only needs to match between the `next start` this
// config launches and the token this suite mints with it.
export const AUTH_SECRET = 'e2e-dummy-auth-secret-never-used-for-real-auth';

export const E2E_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  identitySub: 'e2e-identity-sub',
  email: 'e2e-user@example.test',
  name: 'Minted Session User',
};

export const E2E_LIST = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Minted session list',
};

// Re-exported from the frontend's own definition rather than restated. The
// cookie name doubles as the JWE salt (see session.ts), so a copy that drifted
// would fail decryption instead of failing a comparison.
export { SESSION_COOKIE_NAME } from '../../frontend/src/features/auth/lib/session-cookie';
