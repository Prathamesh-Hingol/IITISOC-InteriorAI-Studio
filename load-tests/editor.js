/**
 * editor.js
 * Load test for the interactive editor/segmentation pipeline.
 *
 * Simulates the full stateful workflow a user goes through:
 *   1. POST /api/editor/segment          — click a point → get mask candidates
 *   2. POST /api/editor/accept-candidate  — accept best candidate
 *   3. POST /api/editor/remove-clicks     — remove a click (simulate undo)
 *   4. POST /api/editor/clear-selection   — reset session
 *   5. POST /api/editor/generate          — final AI inpaint/furniture edit
 *   6. POST /api/editor/segment/extract   — extract segmented object (drag prep)
 *
 * These hit the Python SAM microservice — keep VUs very low.
 * Default preset: smoke (1 VU). For load: TEST_PRESET=load_ai
 *
 * Requires:
 *   K6_TOKENS         — valid Clerk JWT(s)
 *   TEST_VERSION_ID   — a real generation/version UUID owned by the test user(s)
 *   TEST_MASK_URL     — a valid combined mask URL (Cloudinary) for the generate step
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { getOptions, BASE_URL, getAuthHeaders } from './config/options.js';

export const options = getOptions('smoke', 'ai', { testName: 'editor' });

const VERSION_ID = __ENV.TEST_VERSION_ID;
const MASK_URL =
  __ENV.TEST_MASK_URL ||
  'https://res.cloudinary.com/demo/image/upload/sample.jpg'; // placeholder

const PAUSE = Number(__ENV.SLEEP_SECONDS || '1');

export default function () {
  if (!VERSION_ID) {
    console.error('[editor] TEST_VERSION_ID env var is required. Skipping iteration.');
    sleep(1);
    return;
  }

  const headers = getAuthHeaders();

  // ── Step 1: Segment — click a point on the image ─────────────────────────
  group('POST /api/editor/segment', () => {
    const res = http.post(
      `${BASE_URL}/api/editor/segment`,
      JSON.stringify({
        versionId: VERSION_ID,
        x: 0.4,   // normalized coordinates (0.0 – 1.0)
        y: 0.5,
      }),
      {
        headers,
        tags: { endpoint: 'editor_segment' },
        timeout: '30s',
      }
    );

    check(res, {
      'segment status is 200': (r) => r.status === 200,
      'segment returns candidates': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.candidates) || typeof body.session_id === 'string';
        } catch {
          return false;
        }
      },
      'not rate limited': (r) => r.status !== 429,
      'not unauthorized': (r) => r.status !== 401,
    });
  });

  sleep(PAUSE);

  // ── Step 2: Accept candidate — accept the first mask ─────────────────────
  group('POST /api/editor/accept-candidate', () => {
    const res = http.post(
      `${BASE_URL}/api/editor/accept-candidate`,
      JSON.stringify({
        versionId: VERSION_ID,
        maskIndex: 0,
      }),
      {
        headers,
        tags: { endpoint: 'editor_accept_candidate' },
        timeout: '30s',
      }
    );

    check(res, {
      'accept-candidate status is 200': (r) => r.status === 200,
      'accept-candidate returns overlay URL': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (
            typeof body.running_overlay_url === 'string' ||
            typeof body.status === 'string'
          );
        } catch {
          return false;
        }
      },
    });
  });

  sleep(PAUSE);

  // ── Step 3: Remove clicks — simulate undo of click index 0 ───────────────
  group('POST /api/editor/remove-clicks', () => {
    const res = http.post(
      `${BASE_URL}/api/editor/remove-clicks`,
      JSON.stringify({
        versionId: VERSION_ID,
        clickIndices: [0],
      }),
      {
        headers,
        tags: { endpoint: 'editor_remove_clicks' },
        timeout: '30s',
      }
    );

    check(res, {
      'remove-clicks status is 200': (r) => r.status === 200,
      'remove-clicks returns status': (r) => {
        try {
          return JSON.parse(r.body).status !== undefined;
        } catch {
          return false;
        }
      },
    });
  });

  sleep(PAUSE);

  // ── Step 4: Generate — trigger inpaint/furniture edit ────────────────────
  group('POST /api/editor/generate', () => {
    const res = http.post(
      `${BASE_URL}/api/editor/generate`,
      JSON.stringify({
        versionId: VERSION_ID,
        prompt: 'Replace sofa with a modern grey linen sectional',
        combinedMask: MASK_URL,
        furnitureReference: null,
        mode: 'interior-modification',
      }),
      {
        headers,
        tags: { endpoint: 'editor_generate' },
        timeout: '120s', // generation can take up to 2 minutes
      }
    );

    check(res, {
      'generate status is 200': (r) => r.status === 200,
      'generate returns output or queued': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (
            typeof body.outputUrl === 'string' ||
            body.status === 'PENDING' ||
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

  // ── Step 5: Clear selection — reset the session ───────────────────────────
  group('POST /api/editor/clear-selection', () => {
    const res = http.post(
      `${BASE_URL}/api/editor/clear-selection`,
      JSON.stringify({ versionId: VERSION_ID }),
      {
        headers,
        tags: { endpoint: 'editor_clear_selection' },
        timeout: '15s',
      }
    );

    check(res, {
      'clear-selection status is 200': (r) => r.status === 200,
    });
  });

  sleep(PAUSE);

  // ── Step 6: Segment extract — prepare object for drag-and-drop ───────────
  group('POST /api/editor/segment/extract', () => {
    const res = http.post(
      `${BASE_URL}/api/editor/segment/extract`,
      JSON.stringify({ versionId: VERSION_ID }),
      {
        headers,
        tags: { endpoint: 'editor_segment_extract' },
        timeout: '60s',
      }
    );

    check(res, {
      'segment/extract status is 200': (r) => r.status === 200,
      'segment/extract returns cutout URL': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (
            typeof body.cutout_url === 'string' ||
            typeof body.clean_bg_url === 'string'
          );
        } catch {
          return false;
        }
      },
    });
  });

  sleep(PAUSE);
}
