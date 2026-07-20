/**
 * drag.js
 * Load test for the drag-extraction pipeline.
 *
 * Endpoint:
 *   POST /api/drag/extract  — click (x,y) on an image → SAM2 + LaMa + Depth-Anything
 *                             returns { backgroundUrl, cutoutUrl, depthUrl, meta }
 *
 * This calls the Python DRAG_ENDPOINT which runs three heavy models in sequence.
 * Keep VUs very low. Default preset: smoke (1 VU).
 *
 * Requires:
 *   K6_TOKENS       — valid Clerk JWT(s)
 *   TEST_IMAGE_URL  — a publicly accessible image URL
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getOptions, BASE_URL, getAuthHeaders } from './config/options.js';

export const options = getOptions('smoke', 'ai', { testName: 'drag' });

const IMAGE_URL =
  __ENV.TEST_IMAGE_URL ||
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80';

const PAUSE = Number(__ENV.SLEEP_SECONDS || '2');

export default function () {
  const headers = getAuthHeaders();

  const res = http.post(
    `${BASE_URL}/api/drag/extract`,
    JSON.stringify({
      imageUrl: IMAGE_URL,
      x: 300,   // natural pixel coordinates (integer)
      y: 250,
    }),
    {
      headers,
      tags: { endpoint: 'drag_extract' },
      timeout: '120s', // SAM2 + LaMa + Depth-Anything can be slow
    }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'returns backgroundUrl': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.backgroundUrl === 'string';
      } catch {
        return false;
      }
    },
    'returns cutoutUrl': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.cutoutUrl === 'string';
      } catch {
        return false;
      }
    },
    'returns meta': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.meta?.bbox !== undefined || body.meta?.centroid !== undefined;
      } catch {
        return false;
      }
    },
    'not rate limited': (r) => r.status !== 429,
    'not unauthorized': (r) => r.status !== 401,
  });

  sleep(PAUSE);
}
