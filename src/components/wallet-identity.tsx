"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type WalletProvider = {
  request?: (input: { method: string }) => Promise<unknown>;
};

type WalletIdentityValue = {
  address: string;
  busy: boolean;
  notice: string;
  connect: () => Promise<void>;
};

const WalletIdentityContext = createContext<WalletIdentityValue | null>(null);

function browserWallet() {
  if (typeof window === "undefined") {
    return null;
  }

  return (window as Window & { ethereum?: WalletProvider }).ethereum ?? null;
}

function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

export function WalletIdentityProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function connect() {
    const provider = browserWallet();

    if (!provider?.request) {
      setNotice("No browser wallet found.");
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const nextAddress = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0].trim() : "";

      if (!nextAddress) {
        setNotice("The wallet did not return an address.");
        return;
      }

      setAddress(nextAddress);
      setNotice("Address selected. Signed membership is not live yet.");
    } catch {
      setNotice("Wallet connection was cancelled.");
    } finally {
      setBusy(false);
    }
  }

  const value = {
    address,
    busy,
    notice,
    connect,
  };

  return <WalletIdentityContext.Provider value={value}>{children}</WalletIdentityContext.Provider>;
}

export function useWalletIdentity() {
  const value = useContext(WalletIdentityContext);

  if (!value) {
    throw new Error("WalletIdentityProvider is required.");
  }

  return value;
}

export function WalletButton() {
  const wallet = useWalletIdentity();

  return (
    <div className="flex min-w-0 flex-col items-end gap-2">
      <button
        type="button"
        className="min-h-11 rounded-md border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-60"
        disabled={wallet.busy}
        title={wallet.address ? "Address selected. Signature login is not live yet." : undefined}
        onClick={() => void wallet.connect()}
      >
        {wallet.busy ? "Connecting" : wallet.address ? shortAddress(wallet.address) : "Connect wallet"}
      </button>
      {wallet.notice ? (
        <p className="max-w-64 text-right text-xs leading-5 text-zinc-500" aria-live="polite">
          {wallet.notice}
        </p>
      ) : null}
    </div>
  );
}
