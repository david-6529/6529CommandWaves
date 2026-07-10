import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  assertWalletAuthOrigin,
  clearWalletCookie,
  createWalletSession,
  requestCookie,
  secureWalletCookies,
  walletChallengeCookieName,
  walletCookie,
  walletSessionCookieName,
} from "@/lib/wallet-auth";
import { walletSessionLifetimeSeconds } from "@/lib/wallet-auth-contract";

export async function POST(request: Request) {
  try {
    assertRateLimit(request, { namespace: "wallet_verify", max: 10, windowMs: 60_000 });

    const origin = assertWalletAuthOrigin(request);
    const challengeToken = requestCookie(request, walletChallengeCookieName);

    if (!challengeToken) {
      throw Object.assign(new Error("Start a new wallet verification."), { status: 401 });
    }

    const body = await readJsonObject(request, { maxBytes: 4096 });
    const result = await createWalletSession({
      challengeToken,
      signature: body.signature,
      origin,
    });
    const secure = secureWalletCookies(origin);
    const response = json({ session: result.session });

    response.headers.append(
      "Set-Cookie",
      clearWalletCookie({
        name: walletChallengeCookieName,
        path: "/api/auth/wallet",
        secure,
      }),
    );
    response.headers.append(
      "Set-Cookie",
      walletCookie({
        name: walletSessionCookieName,
        value: result.token,
        maxAge: walletSessionLifetimeSeconds,
        path: "/",
        secure,
      }),
    );

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
