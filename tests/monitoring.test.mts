import assert from "node:assert/strict";
import test from "node:test";
import { compareResponse, describeSchema, fetchEndpoint, type EndpointSnapshot, type JsonValue } from "../lib/monitoring.ts";
import { isScheduleFrequency, nextScheduledAt } from "../lib/scheduling.ts";

const baseline: JsonValue = {
  user_id: "usr_demo_1042",
  full_name: "Maya Chen",
  subscription_status: "active",
  plan_name: "growth",
  updated_at: "2026-08-04T00:00:00.000Z",
};
const baselineSchema = describeSchema(baseline);

function snapshot(body: JsonValue): EndpointSnapshot {
  return { ok: true, statusCode: 200, body, durationMs: 20, errorMessage: null };
}

test("an unchanged response contract is healthy", () => {
  assert.deepEqual(compareResponse(baselineSchema, snapshot({ ...baseline, updated_at: "later" })), []);
});

test("missing fields and type changes are serious", () => {
  const changes = compareResponse(baselineSchema, snapshot({ user_id: 1042, full_name: "Maya Chen", subscription_status: "active", updated_at: "later" }));
  assert.ok(changes.some((change) => change.kind === "missing_field" && change.path === "$.plan_name" && change.serious));
  assert.ok(changes.some((change) => change.kind === "type_changed" && change.path === "$.user_id" && change.serious));
});

test("new fields are saved but do not create a serious incident", () => {
  const changes = compareResponse(baselineSchema, snapshot({ ...baseline, account_region: "us-east" }));
  assert.deepEqual(changes, [{ kind: "new_field", path: "$.account_region", expected: null, actual: "string", serious: false }]);
});

test("HTTP errors are serious", () => {
  const changes = compareResponse(baselineSchema, { ok: false, statusCode: 503, body: { error: "down" }, durationMs: 15, errorMessage: "HTTP 503" });
  assert.equal(changes[0].kind, "http_error");
  assert.equal(changes[0].serious, true);
});

test("the Pallos healthy and fault URLs produce a serious contract change", async () => {
  const healthy = await fetchEndpoint("https://pallosagent.com/api/training/profile");
  const fault = await fetchEndpoint("https://pallosagent.com/api/training/profile?fault=1");
  assert.equal(healthy.ok, true);
  assert.equal(fault.ok, true);
  assert.ok(healthy.body);
  assert.ok(fault.body);
  assert.ok(compareResponse(describeSchema(healthy.body!), fault).some((change) => change.serious));
});

test("manual schedules stay paused and daily schedules advance", () => {
  const start = new Date("2026-08-06T15:30:00.000Z");
  assert.equal(nextScheduledAt("manual", start), null);
  assert.equal(nextScheduledAt("daily", start), "2026-08-07T12:00:00.000Z");
  assert.equal(isScheduleFrequency("six_hours"), true);
  assert.equal(isScheduleFrequency("weekly"), false);
});
