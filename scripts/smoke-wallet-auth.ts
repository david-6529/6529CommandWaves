import { writeFileSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { WalletSessionView } from "../src/lib/wallet-auth-contract";

type JsonObject = Record<string, unknown>;

const baseUrl = new URL(process.env.WALLET_SMOKE_BASE_URL ?? "http://localhost:5001");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertLocalTarget() {
  assert(
    baseUrl.hostname === "localhost" || baseUrl.hostname === "127.0.0.1",
    "Wallet auth smoke is restricted to localhost.",
  );
}

function responseCookie(response: Response, name: string) {
  const header = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${name}=`));

  assert(header, `Wallet auth response did not set ${name}.`);

  return header.split(";", 1)[0];
}

async function responseJson(response: Response, label: string) {
  const payload = (await response.json().catch(() => null)) as unknown;

  assert(response.ok, `${label} failed with ${response.status}.`);
  assert(payload && typeof payload === "object" && !Array.isArray(payload), `${label} did not return a JSON object.`);

  return payload as JsonObject;
}

async function main() {
  assertLocalTarget();

  const account = privateKeyToAccount(generatePrivateKey());
  const origin = baseUrl.origin;
  const challengeResponse = await fetch(new URL("/api/auth/wallet/challenge", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
    },
    body: JSON.stringify({ address: account.address, chainId: 1 }),
  });
  const challengePayload = await responseJson(challengeResponse, "Wallet challenge");
  const challenge = challengePayload.challenge as {
    typedData: Parameters<typeof account.signTypedData>[0];
  };

  assert(challenge?.typedData, "Wallet challenge is missing typed data.");

  const signature = await account.signTypedData(challenge.typedData);
  const challengeCookie = responseCookie(challengeResponse, "dc_wallet_challenge");
  const verifyResponse = await fetch(new URL("/api/auth/wallet/verify", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: challengeCookie,
      origin,
    },
    body: JSON.stringify({ signature }),
  });
  const verifyPayload = await responseJson(verifyResponse, "Wallet verification");
  const verifiedSession = verifyPayload.session as WalletSessionView;

  assert(verifiedSession.authenticated, "Verified wallet session is not authenticated.");
  assert(verifiedSession.address === account.address, "Verified wallet session address does not match the signer.");
  assert(verifiedSession.admission.status === "not_open", "Wallet verification granted unexpected admission.");
  assert(
    !verifiedSession.permissions.chat && !verifiedSession.permissions.claim && !verifiedSession.permissions.vote,
    "Wallet verification granted project permissions.",
  );

  const sessionCookie = responseCookie(verifyResponse, "dc_wallet_session");
  const storagePath = process.env.WALLET_SMOKE_STORAGE_PATH?.trim();

  if (storagePath) {
    const cookieValue = decodeURIComponent(sessionCookie.slice(sessionCookie.indexOf("=") + 1));

    writeFileSync(
      storagePath,
      JSON.stringify(
        {
          cookies: [
            {
              name: "dc_wallet_session",
              value: cookieValue,
              domain: baseUrl.hostname,
              path: "/",
              expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
              httpOnly: true,
              secure: baseUrl.protocol === "https:",
              sameSite: "Lax",
            },
          ],
          origins: [],
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  const sessionResponse = await fetch(new URL("/api/auth/session", baseUrl), {
    headers: { cookie: sessionCookie },
  });
  const sessionPayload = await responseJson(sessionResponse, "Wallet session read");
  const readSession = sessionPayload.session as WalletSessionView;

  assert(readSession.authenticated, "Wallet session cookie could not be read.");
  assert(readSession.address === account.address, "Wallet session read returned the wrong address.");

  const logoutResponse = await fetch(new URL("/api/auth/session", baseUrl), {
    method: "DELETE",
    headers: {
      cookie: sessionCookie,
      origin,
    },
  });
  const logoutPayload = await responseJson(logoutResponse, "Wallet logout");
  const loggedOutSession = logoutPayload.session as WalletSessionView;

  assert(!loggedOutSession.authenticated, "Wallet logout did not return a signed-out session.");
  assert(responseCookie(logoutResponse, "dc_wallet_session").endsWith("="), "Wallet logout did not clear the session cookie.");

  console.log(`Wallet auth smoke passed for ${baseUrl.origin}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown wallet auth smoke failure.";

  console.error(`Wallet auth smoke failed: ${message}`);
  process.exitCode = 1;
});
