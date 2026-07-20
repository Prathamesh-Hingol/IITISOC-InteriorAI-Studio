/**
 * config/options.js
 * Shared k6 options factory for InteriorAI Studio load tests.
 *
 * Usage in a test script:
 *   import { getOptions, BASE_URL, getAuthHeaders } from './config/options.js';
 *   export const options = getOptions('smoke');
 *
 * Override preset via env: TEST_PRESET=load k6 run script.js
 */

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

// Load token pool from env — supports comma-separated list for multi-user simulation
const rawTokens = __ENV.K6_TOKENS || __ENV.K6_TOKEN || '';
export const TOKENS = rawTokens ? rawTokens.split(',').map((t) => t.trim()).filter(Boolean) : [];

/**
 * Returns Authorization headers for the current VU.
 * Rotates through the token pool by VU index for multi-user simulation.
 */
export function getAuthHeaders() {
  if (TOKENS.length === 0) {
    console.warn('[k6] No K6_TOKENS set — authenticated requests will fail with 401');
    return { 'Content-Type': 'application/json' };
  }
  const token = TOKENS[(__VU - 1) % TOKENS.length];
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ─── Stage Presets ────────────────────────────────────────────────────────────

const PRESETS = {
  /**
   * smoke — single VU, 30s. Sanity check: "does it work at all?"
   */
  smoke: {
    vus: 1,
    duration: '30s',
  },

  /**
   * load — ramps to realistic concurrent users for standard endpoints.
   */
  load: {
    stages: [
      { duration: '1m', target: 10 },
      { duration: '3m', target: 10 },
      { duration: '1m', target: 0 },
    ],
  },

  /**
   * load_ai — low-VU load test for AI/heavy endpoints.
   * Caps at 2 VUs to protect external Python ML services.
   */
  load_ai: {
    stages: [
      { duration: '1m', target: 2 },
      { duration: '3m', target: 2 },
      { duration: '1m', target: 0 },
    ],
  },

  /**
   * stress — pushes beyond normal load to find breaking point.
   */
  stress: {
    stages: [
      { duration: '2m', target: 20 },
      { duration: '3m', target: 30 },
      { duration: '2m', target: 50 },
      { duration: '1m', target: 0 },
    ],
  },

  /**
   * stress_ai — stress for AI endpoints (low VU, longer duration).
   */
  stress_ai: {
    stages: [
      { duration: '2m', target: 3 },
      { duration: '5m', target: 5 },
      { duration: '1m', target: 0 },
    ],
  },

  /**
   * soak — sustained load to surface memory leaks / queue drain issues.
   */
  soak: {
    stages: [
      { duration: '2m', target: 5 },
      { duration: '20m', target: 5 },
      { duration: '2m', target: 0 },
    ],
  },
};

// ─── Threshold Profiles ───────────────────────────────────────────────────────

const BASE_THRESHOLDS = {
  http_req_failed: ['rate<0.01'],   // < 1% request failures
  checks: ['rate>0.95'],            // > 95% checks pass
};

export const FAST_THRESHOLDS = {
  ...BASE_THRESHOLDS,
  http_req_duration: ['p(95)<500', 'p(99)<1000'],   // fast endpoints
};

export const AI_THRESHOLDS = {
  ...BASE_THRESHOLDS,
  http_req_duration: ['p(95)<30000', 'p(99)<60000'], // AI endpoints can be slow
};

// ─── Options Factory ──────────────────────────────────────────────────────────

/**
 * @param {'smoke'|'load'|'load_ai'|'stress'|'stress_ai'|'soak'} defaultPreset
 * @param {'fast'|'ai'} thresholdProfile
 * @param {object} overrides  Additional k6 options to merge in
 */
export function getOptions(defaultPreset = 'smoke', thresholdProfile = 'fast', overrides = {}) {
  const presetName = __ENV.TEST_PRESET || defaultPreset;
  const preset = PRESETS[presetName];

  if (!preset) {
    throw new Error(
      `Unknown TEST_PRESET "${presetName}". Valid options: ${Object.keys(PRESETS).join(', ')}`
    );
  }

  const thresholds = thresholdProfile === 'ai' ? AI_THRESHOLDS : FAST_THRESHOLDS;

  const { testName, ...otherOverrides } = overrides;

  return {
    ...preset,
    thresholds,
    tags: {
      test_type: presetName,
      ...(testName ? { testName } : {}),
    },
    ...otherOverrides,
  };
}
