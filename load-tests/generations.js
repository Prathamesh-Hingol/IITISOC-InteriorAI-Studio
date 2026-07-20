/**
 * generations.js
 * Load test for AI generation endpoints.
 *
 * Endpoints:
 *   POST /api/generations        — trigger AI room generation (slow, AI-heavy)
 *   POST /api/generations/:id/depth — depth-map generation (slow, AI-heavy)
 *
 * These call external Python ML services and Cloudinary — keep VUs very low.
 * Default preset: smoke (1 VU). For load: TEST_PRESET=load_ai
 *
 * Requires:
 *   K6_TOKENS         — valid Clerk JWT(s)
 *   TEST_PROJECT_ID   — a real project UUID owned by the test user(s)
 *   TEST_IMAGE_URL    — a publicly accessible image URL to use as input
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { getOptions, BASE_URL, getAuthHeaders } from './config/options.js';

export const options = getOptions('smoke', 'ai', { testName: 'generations' });

// These must be set externally — they reference real DB objects
const PROJECT_ID = __ENV.TEST_PROJECT_ID;
const IMAGE_URL =
  __ENV.TEST_IMAGE_URL ||
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80';

const PAUSE = Number(__ENV.SLEEP_SECONDS || '2');

export default function () {
  if (!PROJECT_ID) {
    console.error('[generations] TEST_PROJECT_ID env var is required. Skipping iteration.');
    sleep(1);
    return;
  }

  const headers = getAuthHeaders();
  let generationId = null;

  // ── Step 1: Create a generation ───────────────────────────────────────────
  group('POST /api/generations', () => {
    const payload = JSON.stringify({
      projectId: PROJECT_ID,
      imageUrl: IMAGE_URL,
      prompt: 'Modern minimalist living room with natural light',
      preset: 'Modern',
      creativityStrength: 50,
      generationMode: 'restyle',
    });

    const res = http.post(`${BASE_URL}/api/generations`, payload, {
      headers,
      tags: { endpoint: 'generations_create' },
      timeout: '60s',
    });

    check(res, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'returns generation id': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (body.id) {
            generationId = body.id;
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      'not rate limited': (r) => r.status !== 429,
      'not unauthorized': (r) => r.status !== 401,
    });
  });

  if (!generationId) {
    sleep(PAUSE);
    return;
  }

  sleep(PAUSE);

  // ── Step 2: Trigger depth-map generation for that generation ─────────────
  group('POST /api/generations/:id/depth', () => {
    const res = http.post(
      `${BASE_URL}/api/generations/${generationId}/depth`,
      JSON.stringify({}),
      {
        headers,
        tags: { endpoint: 'generations_depth' },
        timeout: '90s',
      }
    );

    check(res, {
      'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
      'returns depth URL or queued status': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (
            typeof body.depth_preview_url === 'string' ||
            body.status === 'PENDING' ||
            body.status === 'PROCESSING' ||
            body.queued === true
          );
        } catch {
          return false;
        }
      },
      'not rate limited': (r) => r.status !== 429,
    });
  });

  sleep(PAUSE);
}
