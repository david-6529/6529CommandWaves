import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { GET as getSession, DELETE as deleteSession } from "./auth/session/route";
import { POST as createChallenge } from "./auth/wallet/challenge/route";
import { POST as verifyWallet } from "./auth/wallet/verify/route";
import { resetRateLimitsForTest } from "@/lib/rate-limit";
import { walletChallengeCookieName, walletSessionCookieName } from "@/lib/wallet-auth";
import type { WalletSessionView } from "@/lib/wallet-auth-contract";

const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://build.example${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      origin: "https://build.example",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": "203.0.113.92",
      ...(init.headers ?? {}),
    },
  });
}

function responseCookie(response: Response, name: string) {
  const header = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${name}=`));

  if (!header) {
    throw new Error(`Missing ${name} cookie.`);
  }

  return header.split(";", 1)[0];
}

describe("wallet auth routes", () => {
  const previousSecret = process.env.WALLET_SESSION_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  function setNodeEnv(value: string | undefined) {
    const env = process.env as Record<string, string | undefined>;

    if (value === undefined) {
      delete env.NODE_ENV;
      return;
    }

    env.NODE_ENV = value;
  }

  beforeEach(() => {
    process.env.WALLET_SESSION_SECRET = "wallet-session-secret-for-route-tests-123456";
    resetRateLimitsForTest();
  });

  afterEach(() => {
    resetRateLimitsForTest();

    if (previousSecret === undefined) {
      delete process.env.WALLET_SESSION_SECRET;
    } else {
      process.env.WALLET_SESSION_SECRET = previousSecret;
    }

    setNodeEnv(previousNodeEnv);

    if (previousAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }
  });

  it("creates, verifies, reads, and deletes a wallet session", async () => {
    const challengeResponse = await createChallenge(
      request("/api/auth/wallet/challenge", {
        method: "POST",
        body: JSON.stringify({ address: account.address, chainId: 1 }),
      }),
    );
    const challengePayload = (await challengeResponse.json()) as {
      challenge: {
        typedData: Parameters<typeof account.signTypedData>[0];
      };
    };
    const challengeCookie = responseCookie(challengeResponse, walletChallengeCookieName);
    const signature = await account.signTypedData(challengePayload.challenge.typedData);
    const verifyResponse = await verifyWallet(
      request("/api/auth/wallet/verify", {
        method: "POST",
        headers: { cookie: challengeCookie },
        body: JSON.stringify({ signature }),
      }),
    );
    const verifyPayload = (await verifyResponse.json()) as { session: WalletSessionView };
    const sessionCookie = responseCookie(verifyResponse, walletSessionCookieName);
    const sessionResponse = await getSession(
      request("/api/auth/session", {
        headers: { cookie: sessionCookie },
      }),
    );
    const sessionPayload = (await sessionResponse.json()) as { session: WalletSessionView };
    const logoutResponse = await deleteSession(
      request("/api/auth/session", {
        method: "DELETE",
        headers: { cookie: sessionCookie },
      }),
    );

    expect(challengeResponse.status).toBe(200);
    expect(challengeCookie).toContain(walletChallengeCookieName);
    expect(challengeResponse.headers.getSetCookie().join(" ")).toContain("HttpOnly");
    expect(challengeResponse.headers.getSetCookie().join(" ")).toContain("SameSite=Strict");
    expect(challengeResponse.headers.getSetCookie().join(" ")).toContain("Secure");
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.headers.getSetCookie().join(" ")).toContain("SameSite=Lax");
    expect(verifyPayload.session).toMatchObject({
      authenticated: true,
      address: account.address,
      admission: { status: "not_open" },
      permissions: { chat: false, claim: false, vote: false },
    });
    expect(sessionResponse.status).toBe(200);
    expect(sessionPayload.session).toMatchObject({ authenticated: true, address: account.address });
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.headers.getSetCookie().join(" ")).toContain(`${walletSessionCookieName}=`);
    expect(logoutResponse.headers.getSetCookie().join(" ")).toContain("Max-Age=0");
  });

  it("rejects cross-site challenge requests", async () => {
    const response = await createChallenge(
      request("/api/auth/wallet/challenge", {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
        body: JSON.stringify({ address: account.address, chainId: 1 }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Wallet sign-in must start from this app.",
    });
  });

  it("does not create a session without the challenge cookie", async () => {
    const response = await verifyWallet(
      request("/api/auth/wallet/verify", {
        method: "POST",
        body: JSON.stringify({ signature: "0x1234" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "Start a new wallet verification." });
  });

  it("clears an invalid session cookie without authenticating it", async () => {
    const response = await getSession(
      request("/api/auth/session", {
        headers: { cookie: `${walletSessionCookieName}=invalid-token` },
      }),
    );
    const payload = (await response.json()) as { session: WalletSessionView };

    expect(response.status).toBe(200);
    expect(payload.session.authenticated).toBe(false);
    expect(response.headers.getSetCookie().join(" ")).toContain(`${walletSessionCookieName}=`);
    expect(response.headers.getSetCookie().join(" ")).toContain("Max-Age=0");
  });

  it("rate limits repeated challenges for one wallet", async () => {
    for (let index = 0; index < 5; index += 1) {
      const response = await createChallenge(
        request("/api/auth/wallet/challenge", {
          method: "POST",
          body: JSON.stringify({ address: account.address, chainId: 1 }),
        }),
      );

      expect(response.status).toBe(200);
    }

    const limited = await createChallenge(
      request("/api/auth/wallet/challenge", {
        method: "POST",
        body: JSON.stringify({ address: account.address, chainId: 1 }),
      }),
    );

    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toMatchObject({ error: "Too many requests. Try again shortly." });
  });

  it("fails closed when production session configuration is missing", async () => {
    setNodeEnv("production");
    delete process.env.WALLET_SESSION_SECRET;
    process.env.NEXT_PUBLIC_APP_URL = "https://build.example";

    const response = await createChallenge(
      request("/api/auth/wallet/challenge", {
        method: "POST",
        body: JSON.stringify({ address: account.address, chainId: 1 }),
      }),
    );

    expect(response.status).toBe(503);
  });
});
