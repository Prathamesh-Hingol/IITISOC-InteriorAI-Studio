/**
 * scripts/generate-tokens.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pre-test script: creates N Clerk test users and generates JWT session tokens
 * for use in k6 multi-user load tests.
 *
 * Usage:
 *   node scripts/generate-tokens.js
 *
 * Env vars required (in .env.loadtest or environment):
 *   CLERK_SECRET_KEY         — your Clerk Backend secret key (sk_test_xxx)
 *   CLERK_FRONTEND_API_URL   — e.g. https://your-app.clerk.accounts.dev
 *   NUM_USERS                — number of virtual users to create (default: 5)
 *
 * Output:
 *   fixtures/tokens.json  — array of { userId, email, token } objects
 *   (This file is gitignored)
 *
 * Flow:
 *   1. POST /v1/users                           → create test user
 *   2. POST /v1/sign_in_tokens                  → get one-time sign-in ticket
 *   3. POST <frontend>/v1/client/sign_ins       → exchange ticket for session
 *   4. Extract session JWT from response
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_FRONTEND_API_URL = process.env.CLERK_FRONTEND_API_URL;
const NUM_USERS = parseInt(process.env.NUM_USERS || '5', 10);
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const TOKENS_FILE = path.join(FIXTURES_DIR, 'tokens.json');
const USERS_FILE = path.join(FIXTURES_DIR, 'test-user-ids.json'); // for cleanup

if (!CLERK_SECRET_KEY) {
  console.error('❌  CLERK_SECRET_KEY is not set.');
  process.exit(1);
}
if (!CLERK_FRONTEND_API_URL) {
  console.error('❌  CLERK_FRONTEND_API_URL is not set.');
  console.error('    Find it in Clerk Dashboard → API Keys → Frontend API URL');
  process.exit(1);
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function clerkBackend(method, path, body) {
  const url = new URL(`https://api.clerk.com${path}`);
  const response = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Clerk Backend API error [${response.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

async function clerkFrontend(method, path, body) {
  const baseUrl = CLERK_FRONTEND_API_URL.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Clerk Frontend API error [${response.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

// ─── Core logic ───────────────────────────────────────────────────────────────

async function createTestUser(index) {
  const email = `k6-test-user-${index}-${Date.now()}@loadtest.interiorai.dev`;
  const password = `K6LoadTest!${index}${Date.now()}`;

  console.log(`  [${index + 1}/${NUM_USERS}] Creating user: ${email}`);

  const user = await clerkBackend('POST', '/v1/users', {
    email_address: [email],
    password,
    first_name: 'K6',
    last_name: `VU${index + 1}`,
    // Mark as test user so cleanup script can find them by metadata
    public_metadata: { role: 'k6-load-test' },
  });

  return { userId: user.id, email, password };
}

async function getSessionToken(userId) {
  // Step 1: Create a one-time sign-in token via Backend API
  const signInToken = await clerkBackend('POST', '/v1/sign_in_tokens', {
    user_id: userId,
    expires_in_seconds: 7200, // 2-hour token
  });

  // Step 2: Exchange the one-time ticket for a real session via Frontend API
  const signIn = await clerkFrontend('POST', '/v1/client/sign_ins', {
    strategy: 'ticket',
    ticket: signInToken.token,
  });

  // Step 3: Extract the session JWT from the response
  const session = signIn?.client?.sessions?.[0];
  if (!session) {
    throw new Error(`No session returned for user ${userId}. Response: ${JSON.stringify(signIn)}`);
  }

  // The last_active_session_id gives us the session token (short-lived by default).
  // Make sure you've extended session lifetime in Clerk Dashboard → Configure → Sessions.
  const jwt = session.last_active_token?.jwt;
  if (!jwt) {
    throw new Error(
      `No JWT in session for user ${userId}. ` +
      'Check that "Session token lifetime" is set to at least 7200s in Clerk Dashboard.'
    );
  }

  return jwt;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔑  Generating tokens for ${NUM_USERS} virtual users...\n`);

  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  const results = [];
  const userIds = [];

  for (let i = 0; i < NUM_USERS; i++) {
    try {
      const { userId, email, password } = await createTestUser(i);
      userIds.push(userId);

      const token = await getSessionToken(userId);
      results.push({ userId, email, token });
      console.log(`  ✅  Token generated for ${email}`);
    } catch (err) {
      console.error(`  ❌  Failed for user ${i + 1}: ${err.message}`);
    }
  }

  // Save tokens for k6 (K6_TOKENS env var)
  const tokenList = results.map((r) => r.token).join(',');
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(results, null, 2));

  // Save user IDs separately for cleanup script
  fs.writeFileSync(USERS_FILE, JSON.stringify(userIds, null, 2));

  console.log(`\n✅  Done! ${results.length}/${NUM_USERS} tokens saved to fixtures/tokens.json`);
  console.log('\n📋  Add this to your .env.loadtest or export before running k6:');
  console.log(`\n   K6_TOKENS=${tokenList}\n`);
}

main().catch((err) => {
  console.error('\n💥  Fatal error:', err.message);
  process.exit(1);
});
