import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    result_release: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 100),
      duration: __ENV.DURATION || "2m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500", "p(99)<3000"],
  },
};

const baseUrl = __ENV.BASE_URL;
if (!baseUrl) throw new Error("BASE_URL is required");

export default function () {
  // Use a protected, read-only endpoint in staging. Do not point this at
  // production until the school has approved the test window.
  const response = http.get(`${baseUrl}/student-dashboard`, {
    tags: { scenario: "result-release" },
  });
  check(response, {
    "dashboard responds": (r) => r.status === 200 || r.status === 302 || r.status === 307,
  });
  sleep(Math.random() * 2);
}
