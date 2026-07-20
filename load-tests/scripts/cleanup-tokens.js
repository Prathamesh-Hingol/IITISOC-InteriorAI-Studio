/**
 * scripts/cleanup-tokens.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Post-test script: deletes all Clerk test users created by generate-tokens.js.
 *
 * Usage:
 *   node scripts/cleanup-tokens.js
 *
 * Reads user IDs from fixtures/test-user-ids.json (written by generate-tokens.js).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const USERS_FILE = path.join(__dirname, '..', 'fixtures', 'test-user-ids.json');
const TOKENS_FILE = path.join(__dirname, '..', 'fixtures', 'tokens.json');

if (!CLERK_SECRET_KEY) {
  console.error('❌  CLERK_SECRET_KEY is not set.');
  process.exit(1);
}

if (!fs.existsSync(USERS_FILE)) {
  console.log('ℹ️   No test-user-ids.json found — nothing to clean up.');
  process.exit(0);
}

async function deleteUser(userId) {
  const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  if (!response.ok && response.status !== 404) {
    const body = await response.text();
    throw new Error(`Failed to delete ${userId}: [${response.status}] ${body}`);
  }
}

async function main() {
  const userIds = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  console.log(`\n🧹  Cleaning up ${userIds.length} test users from Clerk...\n`);

  let deleted = 0;
  for (const userId of userIds) {
    try {
      await deleteUser(userId);
      console.log(`  ✅  Deleted ${userId}`);
      deleted++;
    } catch (err) {
      console.error(`  ❌  ${err.message}`);
    }
  }

  // Remove fixture files
  fs.unlinkSync(USERS_FILE);
  if (fs.existsSync(TOKENS_FILE)) fs.unlinkSync(TOKENS_FILE);

  console.log(`\n✅  Cleanup complete. Removed ${deleted}/${userIds.length} users.\n`);
}

main().catch((err) => {
  console.error('\n💥  Fatal error:', err.message);
  process.exit(1);
});
