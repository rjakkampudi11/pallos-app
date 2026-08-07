import assert from "node:assert/strict";
import test from "node:test";
import { githubWebhookSignature, verifyGitHubWebhookSignature } from "../lib/github-webhook.ts";

test("accepts the matching GitHub HMAC signature", () => {
  const body = JSON.stringify({ ref: "refs/heads/main", after: "abc123" });
  const signature = githubWebhookSignature(body, "test-secret");
  assert.equal(verifyGitHubWebhookSignature(body, signature, "test-secret"), true);
});

test("rejects changed bodies, malformed signatures, and missing secrets", () => {
  const signature = githubWebhookSignature("original", "test-secret");
  assert.equal(verifyGitHubWebhookSignature("changed", signature, "test-secret"), false);
  assert.equal(verifyGitHubWebhookSignature("original", "sha1=bad", "test-secret"), false);
  assert.equal(verifyGitHubWebhookSignature("original", null, "test-secret"), false);
  assert.equal(verifyGitHubWebhookSignature("original", signature, ""), false);
});
