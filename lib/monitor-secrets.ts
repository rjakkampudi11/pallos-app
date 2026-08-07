import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey() {
  const encoded = process.env.MONITOR_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Private API headers are not configured yet.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("MONITOR_ENCRYPTION_KEY must contain 32 bytes of base64 data.");
  return key;
}

export function encryptHeaders(headers: Record<string, string>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(headers), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString("base64url")).join(".");
}

export function decryptHeaders(value: string | null): Record<string, string> {
  if (!value) return {};
  const [ivPart, tagPart, encryptedPart] = value.split(".");
  if (!ivPart || !tagPart || !encryptedPart) throw new Error("Stored API headers could not be read.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]).toString("utf8")) as Record<string, string>;
}

export function parsePrivateHeader(name?: string, value?: string) {
  const headerName = name?.trim();
  const headerValue = value?.trim();
  if (!headerName && !headerValue) return null;
  if (!headerName || !headerValue) throw new Error("Enter both the private header name and value.");
  if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]{1,80}$/.test(headerName)) throw new Error("Enter a valid HTTP header name.");
  const blocked = new Set(["host", "content-length", "connection", "cookie", "set-cookie", "transfer-encoding"]);
  if (blocked.has(headerName.toLowerCase())) throw new Error("That HTTP header cannot be customized.");
  if (headerValue.length > 4000 || /[\r\n]/.test(headerValue)) throw new Error("Enter a valid HTTP header value.");
  return { [headerName]: headerValue };
}
