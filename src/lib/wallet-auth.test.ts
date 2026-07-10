import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import {
  assertWalletAuthOrigin,
  clearWalletCookie,
  createWalletChallenge,
  createWalletSession,
  requestCookie,
  walletAuthConfiguration,
  walletChallengeCookieName,
  walletCookie,
  walletSessionCookieName,
  walletSessionFromToken,
} from "./wallet-auth";
import { createWalletTypedData } from "./wallet-auth-contract";

const sessionEnv = {
  WALLET_SESSION_SECRET: "wallet-session-secret-for-tests-1234567890",
};
const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const otherAccount = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const now = new Date("2026-07-09T12:00:00.000Z");

describe("wallet auth", () => {
  it("creates a typed challenge and verifies it into a signed session", async () => {
    const challenge = await createWalletChallenge({
      address: account.address.toLowerCase(),
      chainId: 1,
      origin: "https://build.example",
      env: sessionEnv,
      now,
      nonce: "test-nonce-001",
    });
    const signature = await account.signTypedData(
      createWalletTypedData({
        address: challenge.challenge.address,
        chainId: challenge.challenge.chainId,
        ...challenge.challenge.typedData.message,
      }),
    );
    const created = await createWalletSession({
      challengeToken: challenge.token,
      signature,
      origin: "https://build.example",
      env: sessionEnv,
      now,
    });
    const session = await walletSessionFromToken(created.token, sessionEnv, now);

    expect(challenge.challenge).toMatchObject({
      version: "wallet-auth-v0.1",
      address: account.address,
      chainId: 1,
      typedData: {
        domain: {
          name: "Decentralized Coding",
          version: "1",
          chainId: 1,
        },
        primaryType: "BuilderSession",
        types: {
          EIP712Domain: expect.any(Array),
        },
        message: {
          wallet: account.address,
          uri: "https://build.example/",
          nonce: "test-nonce-001",
        },
      },
    });
    expect(session).toMatchObject({
      authenticated: true,
      address: account.address,
      chainId: 1,
      admission: {
        status: "not_open",
        label: "Enrollment not open",
      },
      github: {
        status: "not_linked",
      },
      permissions: {
        chat: false,
        claim: false,
        vote: false,
      },
    });
  });

  it("rejects a signature from a different wallet", async () => {
    const challenge = await createWalletChallenge({
      address: account.address,
      chainId: 1,
      origin: "https://build.example",
      env: sessionEnv,
      now,
    });
    const signature = await otherAccount.signTypedData(
      createWalletTypedData({
        address: challenge.challenge.address,
        chainId: challenge.challenge.chainId,
        ...challenge.challenge.typedData.message,
      }),
    );

    await expect(
      createWalletSession({
        challengeToken: challenge.token,
        signature,
        origin: "https://build.example",
        env: sessionEnv,
        now,
      }),
    ).rejects.toThrow("Wallet signature could not be verified.");
  });

  it("rejects expired challenges and sessions", async () => {
    const challenge = await createWalletChallenge({
      address: account.address,
      chainId: 8453,
      origin: "https://build.example",
      env: sessionEnv,
      now,
    });
    const signature = await account.signTypedData(
      createWalletTypedData({
        address: challenge.challenge.address,
        chainId: challenge.challenge.chainId,
        ...challenge.challenge.typedData.message,
      }),
    );
    const afterChallengeExpiry = new Date(now.getTime() + 6 * 60 * 1000);

    await expect(
      createWalletSession({
        challengeToken: challenge.token,
        signature,
        origin: "https://build.example",
        env: sessionEnv,
        now: afterChallengeExpiry,
      }),
    ).rejects.toThrow("Wallet challenge expired or is invalid.");

    const created = await createWalletSession({
      challengeToken: challenge.token,
      signature,
      origin: "https://build.example",
      env: sessionEnv,
      now,
    });
    const afterSessionExpiry = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    await expect(walletSessionFromToken(created.token, sessionEnv, afterSessionExpiry)).resolves.toMatchObject({
      authenticated: false,
    });
  });

  it("binds challenges and mutations to the app origin", async () => {
    const request = new Request("https://build.example/api/auth/wallet/challenge", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
    });

    expect(() => assertWalletAuthOrigin(request, sessionEnv)).toThrow("Wallet sign-in must start from this app.");
    expect(() =>
      assertWalletAuthOrigin(new Request("https://attacker.example/api/auth/wallet/challenge"), {
        ...sessionEnv,
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://build.example",
      }),
    ).toThrow("Wallet sign-in must use the configured app origin.");

    const challenge = await createWalletChallenge({
      address: account.address,
      chainId: 1,
      origin: "https://build.example",
      env: sessionEnv,
      now,
    });
    const signature = await account.signTypedData(
      createWalletTypedData({
        address: challenge.challenge.address,
        chainId: challenge.challenge.chainId,
        ...challenge.challenge.typedData.message,
      }),
    );

    await expect(
      createWalletSession({
        challengeToken: challenge.token,
        signature,
        origin: "https://other.example",
        env: sessionEnv,
        now,
      }),
    ).rejects.toThrow("Wallet challenge does not match this app.");
  });

  it("requires a production secret and rejects weak or placeholder values", () => {
    expect(walletAuthConfiguration({ NODE_ENV: "development" })).toMatchObject({
      available: true,
      durable: false,
    });
    expect(walletAuthConfiguration({ NODE_ENV: "production" })).toMatchObject({
      available: false,
      durable: false,
    });
    expect(
      walletAuthConfiguration({
        NODE_ENV: "production",
        WALLET_SESSION_SECRET: "replace-with-a-strong-wallet-session-secret",
      }),
    ).toMatchObject({ available: false });
    expect(walletAuthConfiguration({ WALLET_SESSION_SECRET: "too-short" })).toMatchObject({ available: false });
  });

  it("serializes scoped HttpOnly cookies and reads exact cookie names", () => {
    const header = walletCookie({
      name: walletSessionCookieName,
      value: "signed.token",
      maxAge: 3600,
      path: "/",
      secure: true,
    });
    const request = new Request("https://build.example", {
      headers: {
        cookie: `${walletChallengeCookieName}=challenge.token; ${walletSessionCookieName}=signed.token`,
      },
    });

    expect(header).toContain(`${walletSessionCookieName}=signed.token`);
    expect(header).toContain("Path=/");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Secure");
    expect(requestCookie(request, walletSessionCookieName)).toBe("signed.token");
    expect(requestCookie(request, "missing")).toBeNull();
    expect(
      clearWalletCookie({ name: walletChallengeCookieName, path: "/api/auth/wallet", secure: true }),
    ).toContain("Max-Age=0");
  });
});
