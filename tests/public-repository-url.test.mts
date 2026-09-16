import test from "node:test";
import assert from "node:assert/strict";
import { parsePublicGitHubRepository } from "../lib/public-repository-url.ts";

test("parses canonical GitHub repository URLs", () => {
  assert.deepEqual(parsePublicGitHubRepository("https://github.com/OWASP/NodeGoat"), { owner: "OWASP", name: "NodeGoat" });
  assert.deepEqual(parsePublicGitHubRepository("https://github.com/OWASP/NodeGoat.git"), { owner: "OWASP", name: "NodeGoat" });
  assert.deepEqual(parsePublicGitHubRepository("OWASP/NodeGoat"), { owner: "OWASP", name: "NodeGoat" });
});

test("rejects non-GitHub and ambiguous targets", () => {
  assert.equal(parsePublicGitHubRepository("http://github.com/OWASP/NodeGoat"), null);
  assert.equal(parsePublicGitHubRepository("https://evil.example/OWASP/NodeGoat"), null);
  assert.equal(parsePublicGitHubRepository("https://github.com/../settings"), null);
  assert.equal(parsePublicGitHubRepository("not a repository"), null);
});
