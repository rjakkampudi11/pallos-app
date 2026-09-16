export type PublicRepositoryTarget = { owner: string; name: string };

const partPattern = /^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,98}[A-Za-z0-9])?$/;

export function parsePublicGitHubRepository(value: string): PublicRepositoryTarget | null {
  const input = value.trim();
  if (!input || input.length > 300) return null;

  let parts: string[];
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(input)) {
    parts = input.replace(/\.git$/i, "").split("/");
  } else {
    let url: URL;
    try { url = new URL(input); } catch { return null; }
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.username || url.password || url.port) return null;
    parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").slice(0, 2);
    if (parts.length !== 2) return null;
    parts[1] = parts[1].replace(/\.git$/i, "");
  }

  const [owner, name] = parts;
  if (!owner || !name || !partPattern.test(owner) || !partPattern.test(name) || owner.includes("..") || name.includes("..")) return null;
  return { owner, name };
}
