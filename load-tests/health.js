/**
 * health.js
 * Load test for public health probe endpoints.
 *
 * Endpoints:
 *   GET /api/health  — Express app-level health check
 *   GET /api/ready   — Readiness check (verifies Postgres + Redis)
 *
 * These are public (no auth required) and should be extremely fast.
 * Default preset: smoke. Override: TEST_PRESET=load k6 run health.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { getOptions, BASE_URL } from './config/options.js';

export const options = getOptions('smoke', 'fast', { testName: 'health' });

const PAUSE = Number(__ENV.SLEEP_SECONDS || '0.1');

export default function () {
  group('GET /api/health', () => {
    const res = http.get(`${BASE_URL}/api/health`, {
      tags: { endpoint: 'health' },
    });

    check(res, {
      'status is 200': (r) => r.status === 200,
      'body has status ok': (r) => {
        try {
          return JSON.parse(r.body).status === 'ok';
        } catch {
          return false;
        }
      },
      'responds with JSON': (r) =>
        (r.headers['Content-Type'] || '').includes('application/json'),
    });
  });

  sleep(PAUSE);

  group('GET /api/ready', () => {
    const res = http.get(`${BASE_URL}/api/ready`, {
      tags: { endpoint: 'ready' },
    });

    check(res, {
      'status is 200': (r) => r.status === 200,
      'body has status ready': (r) => {
        try {
          return JSON.parse(r.body).status === 'ready';
        } catch {
          return false;
        }
      },
    });
  });

  sleep(PAUSE);
}
