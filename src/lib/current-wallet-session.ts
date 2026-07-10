import { cookies } from "next/headers";
import { walletSessionCookieName, walletSessionFromToken } from "./wallet-auth";

export async function getCurrentWalletSession() {
  const token = (await cookies()).get(walletSessionCookieName)?.value;

  return walletSessionFromToken(token);
}
