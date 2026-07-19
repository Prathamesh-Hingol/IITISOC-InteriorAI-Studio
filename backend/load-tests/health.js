import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://localhost").replace(/\/$/, "");
const endpoint = __ENV.ENDPOINT || "/api/health";
const pauseSeconds = Number(__ENV.SLEEP_SECONDS || "0.1");

export const options = {
  vus: Number(__ENV.VUS || "10"),
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const response = http.get(`${baseUrl}${endpoint}`, {
    tags: { name: endpoint },
  });

  check(response, {
    "returns HTTP 200": (result) => result.status === 200,
    "returns JSON": (result) =>
      result.headers["Content-Type"]?.includes("application/json") ?? false,
  });

  sleep(pauseSeconds);
}
