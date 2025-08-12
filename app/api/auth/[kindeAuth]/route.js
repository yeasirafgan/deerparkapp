import { handleAuth } from '@kinde-oss/kinde-auth-nextjs/server';

// export const runtime = 'edge'; // Add this line
export const GET = handleAuth();
