import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { authenticatedWalletSession, signedOutWalletSession } from "@/lib/wallet-auth-contract";
import { WalletButton, WalletIdentityProvider } from "./wallet-identity";

function renderWallet(initialSession = signedOutWalletSession()) {
  return renderToStaticMarkup(
    <WalletIdentityProvider initialSession={initialSession}>
      <WalletButton />
    </WalletIdentityProvider>,
  );
}

describe("WalletButton", () => {
  it("offers wallet verification without presenting an unverified address", () => {
    const html = renderWallet();

    expect(html).toContain("Connect wallet");
    expect(html).not.toContain("Verified wallet");
    expect(html).not.toContain("Enrollment not open");
  });

  it("shows verified identity and the unavailable admission state from the server session", () => {
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;
    const html = renderWallet(
      authenticatedWalletSession({
        address,
        chainId: 1,
        expiresAt: "2026-07-10T12:00:00.000Z",
      }),
    );

    expect(html).toContain(`aria-label="Verified wallet ${address}"`);
    expect(html).toContain("0xf39F...2266");
    expect(html).toContain("Enrollment not open");
    expect(html).toContain("GitHub not linked");
    expect(html).toContain("Sign out");
    expect(html).not.toContain("Connect wallet");
  });

  it("fails closed when wallet auth is not configured", () => {
    const html = renderWallet(signedOutWalletSession(false));

    expect(html).toContain("Wallet unavailable");
    expect(html).toContain("disabled");
  });
});
