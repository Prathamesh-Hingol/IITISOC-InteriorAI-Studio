/**
 * upload.js
 * Load test for image upload endpoint.
 *
 * Endpoint:
 *   POST /api/uploads  — multipart/form-data image upload → Cloudinary
 *
 * Requires:
 *   K6_TOKENS or K6_TOKEN — valid Clerk JWT(s)
 *
 * The script reads a small sample JPEG from fixtures/sample.jpg using k6's
 * open() which resolves relative to the script file at init time.
 *
 * Default preset: smoke. Override: TEST_PRESET=load k6 run upload.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getOptions, BASE_URL, getAuthHeaders } from './config/options.js';

// open() is called at init time (outside default function) — required by k6
const sampleImage = open('./fixtures/sample.jpg', 'b');

export const options = getOptions('smoke', 'fast', { testName: 'upload' });

const PAUSE = Number(__ENV.SLEEP_SECONDS || '0.5');

export default function () {
  const headers = getAuthHeaders();
  // Remove Content-Type for multipart — k6 sets it automatically with the boundary
  delete headers['Content-Type'];

  const payload = {
    image: http.file(sampleImage, 'sample.jpg', 'image/jpeg'),
  };

  const res = http.post(`${BASE_URL}/api/uploads`, payload, {
    headers,
    tags: { endpoint: 'upload' },
    timeout: '30s',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'returns image URL': (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.url === 'string' && body.url.startsWith('http');
      } catch {
        return false;
      }
    },
    'not rate limited': (r) => r.status !== 429,
    'not unauthorized': (r) => r.status !== 401,
  });

  sleep(PAUSE);
}
