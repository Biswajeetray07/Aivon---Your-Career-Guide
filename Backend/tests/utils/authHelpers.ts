import { sign } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'aivon-secret-change-me';

interface MockUserParams {
  role?: 'USER' | 'ADMIN' | 'SUPERADMIN';
  expired?: boolean;
}

/**
 * Generates a mock JWT and formatted headers for API requests.
 */
export async function generateMockSessionCookie({ role = 'USER', expired = false }: MockUserParams = {}) {
  const payload = {
    userId: uuidv4(),
    email: `test_${role.toLowerCase()}@aivon.io`,
    role,
  };

  const options: any = {
    expiresIn: expired ? '-1h' : '1h', // If expired, set it to the past
  };

  const token = sign(payload, JWT_SECRET, options);

  return {
    token,
    payload,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}
