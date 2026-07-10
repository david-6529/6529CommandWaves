import { handleRouteError, json } from "@/lib/api";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  assertWalletAuthOrigin,
  clearWalletCookie,
  requestCookie,
  secureWalletCookies,
  walletChallengeCookieName,
  walletSessionCookieName,
  walletSessionFromToken,
} from "@/lib/wallet-auth";

export async function GET(request: Request) {
  try {
    assertRateLimit(request, { namespace: "wallet_session", max: 60, windowMs: 60_000 });

    const token = requestCookie(request, walletSessionCookieName);
    const session = await walletSessionFromToken(token);
    const response = json({ session });

    if (token && !session.authenticated) {
      response.headers.append(
        "Set-Cookie",
        clearWalletCookie({
          name: walletSessionCookieName,
          path: "/",
          secure: new URL(request.url).protocol === "https:",
        }),
      );
    }

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertRateLimit(request, { namespace: "wallet_logout", max: 20, windowMs: 60_000 });

    const origin = assertWalletAuthOrigin(request);
    const secure = secureWalletCookies(origin);
    const response = json({ session: await walletSessionFromToken(null) });

    response.headers.append(
      "Set-Cookie",
      clearWalletCookie({
        name: walletSessionCookieName,
        path: "/",
        secure,
      }),
    );
    response.headers.append(
      "Set-Cookie",
      clearWalletCookie({
        name: walletChallengeCookieName,
        path: "/api/auth/wallet",
        secure,
      }),
    );

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
