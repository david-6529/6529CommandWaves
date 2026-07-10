import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { assertRateLimit, assertRateLimitForKey } from "@/lib/rate-limit";
import {
  assertWalletAuthOrigin,
  createWalletChallenge,
  normalizeWalletAddress,
  secureWalletCookies,
  walletChallengeCookieName,
  walletCookie,
} from "@/lib/wallet-auth";
import { walletChallengeLifetimeSeconds } from "@/lib/wallet-auth-contract";

export async function POST(request: Request) {
  try {
    assertRateLimit(request, { namespace: "wallet_challenge", max: 20, windowMs: 60_000 });

    const origin = assertWalletAuthOrigin(request);
    const body = await readJsonObject(request, { maxBytes: 4096 });
    const address = normalizeWalletAddress(body.address);

    assertRateLimitForKey(address, {
      namespace: "wallet_challenge_address",
      max: 5,
      windowMs: walletChallengeLifetimeSeconds * 1000,
    });

    const result = await createWalletChallenge({
      address,
      chainId: body.chainId,
      origin,
    });
    const response = json({ challenge: result.challenge });

    response.headers.append(
      "Set-Cookie",
      walletCookie({
        name: walletChallengeCookieName,
        value: result.token,
        maxAge: walletChallengeLifetimeSeconds,
        path: "/api/auth/wallet",
        secure: secureWalletCookies(origin),
      }),
    );

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
