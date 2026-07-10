import { randomBytes, randomUUID } from "node:crypto";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { getAddress, isAddress, isHex, verifyTypedData, type Hex } from "viem";
import { hasEnvValue, isPlaceholderValue, isProductionEnv } from "./env-placeholders";
import {
  authenticatedWalletSession,
  createWalletRpcTypedData,
  createWalletTypedData,
  signedOutWalletSession,
  walletAuthVersion,
  walletChallengeLifetimeSeconds,
  walletSessionLifetimeSeconds,
  type WalletChallengeClaims,
  type WalletSessionView,
} from "./wallet-auth-contract";

export const walletChallengeCookieName = "dc_wallet_challenge";
export const walletSessionCookieName = "dc_wallet_session";

const walletAuthIssuer = "decentralized-coding";
const walletChallengeAudience = "wallet-challenge";
const walletSessionAudience = "wallet-session";
const minimumSecretLength = 32;
const maxSignatureLength = 1024;

type WalletAuthEnv = Record<string, string | undefined>;

type WalletSessionClaims = {
  address: `0x${string}`;
  chainId: number;
  sessionId: string;
  issuedAt: string;
  expiresAt: string;
};

const globalWalletAuth = globalThis as typeof globalThis & {
  __decentralizedCodingWalletSecret?: string;
};

function configurationError(env: WalletAuthEnv) {
  const secret = env.WALLET_SESSION_SECRET?.trim() ?? "";

  if (!secret) {
    return isProductionEnv(env) ? "WALLET_SESSION_SECRET is required for wallet sign-in." : null;
  }

  if (isPlaceholderValue(secret)) {
    return "Replace placeholder WALLET_SESSION_SECRET before wallet sign-in is enabled.";
  }

  if (secret.length < minimumSecretLength) {
    return `WALLET_SESSION_SECRET must contain at least ${minimumSecretLength} characters.`;
  }

  return null;
}

export function walletAuthConfiguration(env: WalletAuthEnv = process.env) {
  const error = configurationError(env);
  const configured = hasEnvValue(env.WALLET_SESSION_SECRET) && !error;

  return {
    available: !error,
    durable: configured,
    error,
  };
}

function secretValue(env: WalletAuthEnv) {
  const configuration = walletAuthConfiguration(env);

  if (!configuration.available) {
    throw Object.assign(new Error(configuration.error ?? "Wallet sign-in is not configured."), { status: 503 });
  }

  const configured = env.WALLET_SESSION_SECRET?.trim();

  if (configured) {
    return configured;
  }

  globalWalletAuth.__decentralizedCodingWalletSecret ??= randomBytes(32).toString("base64url");

  return globalWalletAuth.__decentralizedCodingWalletSecret;
}

function secretKey(env: WalletAuthEnv) {
  return new TextEncoder().encode(secretValue(env));
}

function timestamp(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function authError(message: string, status = 401) {
  return Object.assign(new Error(message), { status });
}

function payloadString(payload: JWTPayload, key: string) {
  const value = payload[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function payloadNumber(payload: JWTPayload, key: string) {
  const value = payload[key];

  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function expectedRequestOrigin(request: Request, env: WalletAuthEnv) {
  const requestOrigin = new URL(request.url).origin;

  if (!isProductionEnv(env)) {
    return requestOrigin;
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

  if (!appUrl || isPlaceholderValue(appUrl)) {
    throw Object.assign(new Error("Set NEXT_PUBLIC_APP_URL before enabling wallet sign-in."), { status: 503 });
  }

  let origin: string;

  try {
    origin = new URL(appUrl).origin;
  } catch {
    throw Object.assign(new Error("NEXT_PUBLIC_APP_URL must be a valid HTTPS URL for wallet sign-in."), { status: 503 });
  }

  if (!origin.startsWith("https://")) {
    throw Object.assign(new Error("NEXT_PUBLIC_APP_URL must be a valid HTTPS URL for wallet sign-in."), { status: 503 });
  }

  if (requestOrigin !== origin) {
    throw authError("Wallet sign-in must use the configured app origin.", 403);
  }

  return origin;
}

export function assertWalletAuthOrigin(request: Request, env: WalletAuthEnv = process.env) {
  const expectedOrigin = expectedRequestOrigin(request, env);
  const suppliedOrigin = request.headers.get("origin")?.trim();
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site" && fetchSite !== "none") {
    throw authError("Wallet sign-in must start from this app.", 403);
  }

  if (suppliedOrigin) {
    let normalizedOrigin: string;

    try {
      normalizedOrigin = new URL(suppliedOrigin).origin;
    } catch {
      throw authError("Wallet sign-in origin is invalid.", 403);
    }

    if (normalizedOrigin !== expectedOrigin) {
      throw authError("Wallet sign-in must start from this app.", 403);
    }
  }

  return expectedOrigin;
}

export function normalizeWalletAddress(value: unknown) {
  if (typeof value !== "string" || value.length > 64 || !isAddress(value, { strict: false })) {
    throw authError("Use a valid EVM wallet address.", 400);
  }

  return getAddress(value);
}

export function normalizeWalletChainId(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw authError("Use a valid wallet chain ID.", 400);
  }

  return value;
}

function normalizeSignature(value: unknown) {
  if (typeof value !== "string" || value.length > maxSignatureLength || !isHex(value, { strict: true })) {
    throw authError("Wallet signature is invalid.", 400);
  }

  return value as Hex;
}

function challengeClaimsFromPayload(payload: JWTPayload): WalletChallengeClaims {
  const address = payload.sub;
  const chainId = payloadNumber(payload, "chainId");
  const uri = payloadString(payload, "uri");
  const nonce = payloadString(payload, "nonce");
  const issuedAt = payloadString(payload, "issuedAt");
  const expirationTime = payloadString(payload, "expirationTime");
  const statement = payloadString(payload, "statement");

  if (
    payload.kind !== "challenge" ||
    !address ||
    !isAddress(address, { strict: false }) ||
    !chainId ||
    !uri ||
    !nonce ||
    !issuedAt ||
    !expirationTime ||
    !statement
  ) {
    throw authError("Wallet challenge is invalid.");
  }

  return {
    address: getAddress(address),
    chainId,
    uri,
    nonce,
    issuedAt,
    expirationTime,
    statement,
  };
}

function sessionClaimsFromPayload(payload: JWTPayload): WalletSessionClaims {
  const address = payload.sub;
  const chainId = payloadNumber(payload, "chainId");
  const sessionId = payloadString(payload, "sessionId");
  const issuedAt = payloadString(payload, "issuedAt");
  const expiresAt = payloadString(payload, "expiresAt");

  if (
    payload.kind !== "session" ||
    !address ||
    !isAddress(address, { strict: false }) ||
    !chainId ||
    !sessionId ||
    !issuedAt ||
    !expiresAt
  ) {
    throw authError("Wallet session is invalid.");
  }

  return {
    address: getAddress(address),
    chainId,
    sessionId,
    issuedAt,
    expiresAt,
  };
}

export async function createWalletChallenge(input: {
  address: unknown;
  chainId: unknown;
  origin: string;
  env?: WalletAuthEnv;
  now?: Date;
  nonce?: string;
}) {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date();
  const address = normalizeWalletAddress(input.address);
  const chainId = normalizeWalletChainId(input.chainId);
  const expiresAt = new Date(now.getTime() + walletChallengeLifetimeSeconds * 1000);
  const claims: WalletChallengeClaims = {
    address,
    chainId,
    uri: new URL("/", input.origin).toString(),
    nonce: input.nonce ?? randomBytes(16).toString("hex"),
    issuedAt: now.toISOString(),
    expirationTime: expiresAt.toISOString(),
    statement: "Verify wallet ownership for this public build. This does not grant membership or approve work.",
  };
  const token = await new SignJWT({
    kind: "challenge",
    chainId,
    uri: claims.uri,
    nonce: claims.nonce,
    issuedAt: claims.issuedAt,
    expirationTime: claims.expirationTime,
    statement: claims.statement,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(walletAuthIssuer)
    .setAudience(walletChallengeAudience)
    .setSubject(address)
    .setJti(randomUUID())
    .setIssuedAt(timestamp(now))
    .setExpirationTime(timestamp(expiresAt))
    .sign(secretKey(env));

  return {
    token,
    expiresAt,
    challenge: {
      version: walletAuthVersion,
      address,
      chainId,
      expiresAt: expiresAt.toISOString(),
      typedData: createWalletRpcTypedData(claims),
    },
  };
}

async function verifiedChallenge(input: {
  token: string;
  signature: unknown;
  origin: string;
  env: WalletAuthEnv;
  now: Date;
}) {
  let payload: JWTPayload;

  try {
    ({ payload } = await jwtVerify(input.token, secretKey(input.env), {
      algorithms: ["HS256"],
      issuer: walletAuthIssuer,
      audience: walletChallengeAudience,
      currentDate: input.now,
    }));
  } catch {
    throw authError("Wallet challenge expired or is invalid.");
  }

  const claims = challengeClaimsFromPayload(payload);

  if (claims.uri !== new URL("/", input.origin).toString()) {
    throw authError("Wallet challenge does not match this app.");
  }

  const signature = normalizeSignature(input.signature);
  const valid = await verifyTypedData({
    address: claims.address,
    ...createWalletTypedData(claims),
    signature,
  }).catch(() => false);

  if (!valid) {
    throw authError("Wallet signature could not be verified.");
  }

  return claims;
}

export async function createWalletSession(input: {
  challengeToken: string;
  signature: unknown;
  origin: string;
  env?: WalletAuthEnv;
  now?: Date;
}) {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date();
  const challenge = await verifiedChallenge({
    token: input.challengeToken,
    signature: input.signature,
    origin: input.origin,
    env,
    now,
  });
  const expiresAt = new Date(now.getTime() + walletSessionLifetimeSeconds * 1000);
  const sessionId = randomUUID();
  const token = await new SignJWT({
    kind: "session",
    chainId: challenge.chainId,
    sessionId,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(walletAuthIssuer)
    .setAudience(walletSessionAudience)
    .setSubject(challenge.address)
    .setJti(sessionId)
    .setIssuedAt(timestamp(now))
    .setExpirationTime(timestamp(expiresAt))
    .sign(secretKey(env));

  return {
    token,
    expiresAt,
    session: authenticatedWalletSession({
      address: challenge.address,
      chainId: challenge.chainId,
      expiresAt: expiresAt.toISOString(),
    }),
  };
}

export async function walletSessionFromToken(
  token: string | null | undefined,
  env: WalletAuthEnv = process.env,
  now = new Date(),
): Promise<WalletSessionView> {
  const configuration = walletAuthConfiguration(env);

  if (!configuration.available) {
    return signedOutWalletSession(false);
  }

  if (!token) {
    return signedOutWalletSession();
  }

  try {
    const { payload } = await jwtVerify(token, secretKey(env), {
      algorithms: ["HS256"],
      issuer: walletAuthIssuer,
      audience: walletSessionAudience,
      currentDate: now,
    });
    const claims = sessionClaimsFromPayload(payload);

    return authenticatedWalletSession({
      address: claims.address,
      chainId: claims.chainId,
      expiresAt: claims.expiresAt,
    });
  } catch {
    return signedOutWalletSession();
  }
}

export function requestCookie(request: Request, name: string) {
  const pairs = request.headers.get("cookie")?.split(";") ?? [];

  for (const pair of pairs) {
    const separator = pair.indexOf("=");

    if (separator < 0 || pair.slice(0, separator).trim() !== name) {
      continue;
    }

    const value = pair.slice(separator + 1).trim();

    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}

export function walletCookie(input: {
  name: string;
  value: string;
  maxAge: number;
  path: string;
  secure: boolean;
}) {
  return [
    `${input.name}=${encodeURIComponent(input.value)}`,
    `Path=${input.path}`,
    `Max-Age=${input.maxAge}`,
    "HttpOnly",
    `SameSite=${input.name === walletChallengeCookieName ? "Strict" : "Lax"}`,
    "Priority=High",
    ...(input.secure ? ["Secure"] : []),
  ].join("; ");
}

export function clearWalletCookie(input: { name: string; path: string; secure: boolean }) {
  return `${walletCookie({ ...input, value: "", maxAge: 0 })}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function secureWalletCookies(origin: string) {
  return new URL(origin).protocol === "https:";
}
