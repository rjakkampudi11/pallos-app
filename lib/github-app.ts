import "server-only";

import { createSign, randomBytes } from "node:crypto";

const githubApi = "https://api.github.com";

export const GITHUB_SETUP_MESSAGE = "GitHub is not connected yet. Add the GitHub App environment variables.";

export function githubConfigured() {
  return Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_PRIVATE_KEY);
}

export function githubAppSlug() {
  return process.env.GITHUB_APP_SLUG?.trim() || "";
}

export function createOAuthState() {
  return randomBytes(32).toString("hex");
}

function privateKey() {
  return (process.env.GITHUB_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function appJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: now - 30, exp: now + 9 * 60, iss: process.env.GITHUB_APP_ID }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(privateKey(), "base64url")}`;
}

export async function githubFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${githubApi}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Pallos-Agent",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(`GitHub request failed (${response.status}): ${detail.message || "Unknown error"}`);
  }
  return response.json() as Promise<T>;
}

export async function exchangeOAuthCode(code: string) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
    cache: "no-store",
  });
  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "GitHub did not return an access token.");
  return data.access_token;
}

export type GitHubInstallation = { id: number; account: { login: string; type: string } };
export type GitHubRepository = { id: number; name: string; full_name: string; private: boolean; default_branch: string; owner: { login: string } };

export async function listUserInstallations(userToken: string) {
  const data = await githubFetch<{ installations: GitHubInstallation[] }>("/user/installations?per_page=100", userToken);
  return data.installations;
}

export async function listUserInstallationRepositories(userToken: string, installationId: number) {
  const data = await githubFetch<{ repositories: GitHubRepository[] }>(`/user/installations/${installationId}/repositories?per_page=100`, userToken);
  return data.repositories;
}

export async function installationToken(installationId: number) {
  const data = await githubFetch<{ token: string }>(`/app/installations/${installationId}/access_tokens`, appJwt(), { method: "POST" });
  return data.token;
}

export async function installationRequest<T>(installationId: number, path: string) {
  return githubFetch<T>(path, await installationToken(installationId));
}

type RepositoryWebhook = {
  id: number;
  active: boolean;
  events: string[];
  config: { url?: string };
};

export async function ensureRepositoryPushWebhook(installationId: number, fullName: string) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("GITHUB_WEBHOOK_SECRET is not configured.");

  const token = await installationToken(installationId);
  const repositoryPath = `/repos/${fullName.split("/").map(encodeURIComponent).join("/")}/hooks`;
  const webhookUrl = "https://pallosagent.com/api/github/webhooks";
  const hooks = await githubFetch<RepositoryWebhook[]>(`${repositoryPath}?per_page=100`, token);
  const existing = hooks.find((hook) => hook.config.url === webhookUrl);
  const body = JSON.stringify({
    active: true,
    events: ["push", "pull_request"],
    config: { url: webhookUrl, content_type: "json", secret, insecure_ssl: "0" },
  });

  if (existing) {
    await githubFetch(`${repositoryPath}/${existing.id}`, token, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    return { id: existing.id, created: false };
  }

  const created = await githubFetch<RepositoryWebhook>(repositoryPath, token, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  return { id: created.id, created: true };
}

export async function commentOnPullRequest(installationId: number, fullName: string, pullRequestNumber: number, body: string) {
  const token = await installationToken(installationId);
  const repositoryPath = `/repos/${fullName.split("/").map(encodeURIComponent).join("/")}`;
  return githubFetch(`${repositoryPath}/issues/${pullRequestNumber}/comments`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

export async function removeRepositoryPushWebhook(installationId: number, fullName: string) {
  const token = await installationToken(installationId);
  const repositoryPath = `/repos/${fullName.split("/").map(encodeURIComponent).join("/")}/hooks`;
  const hooks = await githubFetch<RepositoryWebhook[]>(`${repositoryPath}?per_page=100`, token);
  const webhookUrl = "https://pallosagent.com/api/github/webhooks";
  const matching = hooks.filter((hook) => hook.config.url === webhookUrl);
  await Promise.all(matching.map((hook) => githubFetch(`${repositoryPath}/${hook.id}`, token, { method: "DELETE" })));
  return matching.length;
}
