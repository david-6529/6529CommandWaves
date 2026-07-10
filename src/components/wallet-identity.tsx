"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { siteCopy } from "@/lib/site-copy";
import { signedOutWalletSession, type WalletSessionView } from "@/lib/wallet-auth-contract";

type WalletProvider = {
  request?: (input: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type WalletIdentityValue = {
  address: string;
  authenticated: boolean;
  busy: boolean;
  notice: string;
  session: WalletSessionView;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

type JsonObject = Record<string, unknown>;

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

function jsonObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : null;
}

function responseError(payload: unknown, status: number) {
  if (status === 503) {
    return "Wallet sign-in is not available.";
  }

  const message = jsonObject(payload)?.error;

  return typeof message === "string" && message.trim() ? siteCopy(message) : "Wallet sign-in failed.";
}

async function responsePayload(response: Response) {
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(responseError(payload, response.status));
  }

  return jsonObject(payload);
}

function sessionFromPayload(payload: JsonObject | null) {
  const session = jsonObject(payload?.session);

  if (!session || typeof session.authenticated !== "boolean" || typeof session.available !== "boolean") {
    throw new Error("Wallet session response is invalid.");
  }

  if (session.authenticated && typeof session.address !== "string") {
    throw new Error("Wallet session response is invalid.");
  }

  return session as WalletSessionView;
}

function challengeFromPayload(payload: JsonObject | null) {
  const challenge = jsonObject(payload?.challenge);
  const typedData = jsonObject(challenge?.typedData);

  if (!challenge || !typedData || typeof challenge.address !== "string") {
    throw new Error("Wallet challenge response is invalid.");
  }

  return {
    address: challenge.address,
    typedData,
  };
}

function selectedAddress(value: unknown) {
  return Array.isArray(value) && typeof value[0] === "string" ? value[0].trim() : "";
}

function selectedChainId(value: unknown) {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) {
    return null;
  }

  const chainId = Number.parseInt(value.slice(2), 16);

  return Number.isSafeInteger(chainId) && chainId > 0 ? chainId : null;
}

function walletRequestCancelled(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === 4001);
}

export function WalletIdentityProvider({
  children,
  initialSession = signedOutWalletSession(),
}: {
  children: ReactNode;
  initialSession?: WalletSessionView;
}) {
  const [session, setSession] = useState(initialSession);
  const [action, setAction] = useState<"idle" | "connect" | "disconnect">("idle");
  const [notice, setNotice] = useState("");
  const busy = action !== "idle";

  async function connect() {
    const provider = browserWallet();

    if (!session.available) {
      setNotice("Wallet sign-in is not available.");
      return;
    }

    if (!provider?.request) {
      setNotice("No browser wallet found.");
      return;
    }

    setAction("connect");
    setNotice("");

    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const address = selectedAddress(accounts);
      const chainId = selectedChainId(await provider.request({ method: "eth_chainId" }));

      if (!address || !chainId) {
        throw new Error("The wallet did not return a valid account and chain.");
      }

      const challengeResponse = await fetch("/api/auth/wallet/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, chainId }),
      });
      const challenge = challengeFromPayload(await responsePayload(challengeResponse));
      const signature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [challenge.address, JSON.stringify(challenge.typedData)],
      });

      if (typeof signature !== "string") {
        throw new Error("The wallet did not return a signature.");
      }

      const verifyResponse = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      const nextSession = sessionFromPayload(await responsePayload(verifyResponse));

      setSession(nextSession);
      setNotice("Wallet verified. Enrollment has not opened.");
    } catch (error) {
      setNotice(
        siteCopy(
          walletRequestCancelled(error)
            ? "Wallet request was cancelled."
            : error instanceof Error
              ? error.message
              : "Wallet sign-in failed.",
        ),
      );
    } finally {
      setAction("idle");
    }
  }

  async function disconnect() {
    setAction("disconnect");
    setNotice("");

    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      const nextSession = sessionFromPayload(await responsePayload(response));

      setSession(nextSession);
      setNotice("Signed out.");
    } catch (error) {
      setNotice(siteCopy(error instanceof Error ? error.message : "Sign out failed."));
    } finally {
      setAction("idle");
    }
  }

  const value = {
    address: session.authenticated ? (session.address ?? "") : "",
    authenticated: session.authenticated,
    busy,
    notice,
    session,
    connect,
    disconnect,
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

  if (!wallet.authenticated || !wallet.session.address) {
    return (
      <div className="flex min-w-0 flex-col items-end gap-2">
        <button
          type="button"
          className="min-h-11 rounded-md border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={wallet.busy || !wallet.session.available}
          onClick={() => void wallet.connect()}
        >
          {wallet.busy ? "Verify wallet" : wallet.session.available ? "Connect wallet" : "Wallet unavailable"}
        </button>
        {wallet.notice ? (
          <p className="max-w-72 text-right text-xs leading-5 text-zinc-500" aria-live="polite">
            {wallet.notice}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-end gap-2">
      <details className="group relative">
        <summary
          className="flex min-h-11 list-none items-center gap-2 rounded-md border border-lime-900 bg-lime-950/20 px-3 text-sm font-semibold text-zinc-100 transition hover:border-lime-700 hover:bg-lime-950/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 [&::-webkit-details-marker]:hidden"
          aria-label={`Verified wallet ${wallet.session.address}`}
        >
          <span className="size-2 rounded-full bg-lime-300" aria-hidden="true" />
          <span>{shortAddress(wallet.session.address)}</span>
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-md border border-zinc-700 bg-[#101012] p-4 shadow-xl shadow-black/40">
          <p className="text-xs font-semibold uppercase text-lime-300">Verified wallet</p>
          <p className="mt-2 break-all font-mono text-xs leading-5 text-zinc-300">{wallet.session.address}</p>
          <dl className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800 text-sm">
            <div className="py-3">
              <dt className="text-xs text-zinc-600">Admission</dt>
              <dd className="mt-1 font-semibold text-zinc-200">{wallet.session.admission.label}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs text-zinc-600">Identity</dt>
              <dd className="mt-1 font-semibold text-zinc-200">{wallet.session.github.label}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="mt-4 min-h-10 w-full rounded-md border border-zinc-700 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-60"
            disabled={wallet.busy}
            onClick={() => void wallet.disconnect()}
          >
            {wallet.busy ? "Signing out" : "Sign out"}
          </button>
        </div>
      </details>
      {wallet.notice ? (
        <p className="max-w-72 text-right text-xs leading-5 text-zinc-500" aria-live="polite">
          {wallet.notice}
        </p>
      ) : null}
    </div>
  );
}
