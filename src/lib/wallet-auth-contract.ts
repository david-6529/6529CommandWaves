export const walletAuthVersion = "wallet-auth-v0.1" as const;
export const walletChallengeLifetimeSeconds = 5 * 60;
export const walletSessionLifetimeSeconds = 24 * 60 * 60;

export const walletAuthTypes = {
  BuilderSession: [
    { name: "wallet", type: "address" },
    { name: "uri", type: "string" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "string" },
    { name: "expirationTime", type: "string" },
    { name: "statement", type: "string" },
  ],
} as const;

const walletAuthDomainTypes = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
] as const;

export type WalletChallengeClaims = {
  address: `0x${string}`;
  chainId: number;
  uri: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  statement: string;
};

export function createWalletTypedData(claims: WalletChallengeClaims) {
  return {
    domain: {
      name: "Decentralized Coding",
      version: "1",
      chainId: claims.chainId,
    },
    types: walletAuthTypes,
    primaryType: "BuilderSession" as const,
    message: {
      wallet: claims.address,
      uri: claims.uri,
      nonce: claims.nonce,
      issuedAt: claims.issuedAt,
      expirationTime: claims.expirationTime,
      statement: claims.statement,
    },
  } as const;
}

export function createWalletRpcTypedData(claims: WalletChallengeClaims) {
  const typedData = createWalletTypedData(claims);

  return {
    ...typedData,
    types: {
      EIP712Domain: walletAuthDomainTypes,
      ...typedData.types,
    },
  } as const;
}

export type WalletSessionView = {
  version: typeof walletAuthVersion;
  available: boolean;
  authenticated: boolean;
  address: `0x${string}` | null;
  chainId: number | null;
  expiresAt: string | null;
  admission: {
    status: "signed_out" | "not_open";
    label: string;
    detail: string;
  };
  github: {
    status: "unavailable" | "not_linked";
    label: string;
  };
  permissions: {
    chat: false;
    claim: false;
    vote: false;
  };
};

export function signedOutWalletSession(available = true): WalletSessionView {
  return {
    version: walletAuthVersion,
    available,
    authenticated: false,
    address: null,
    chainId: null,
    expiresAt: null,
    admission: {
      status: "signed_out",
      label: "Wallet not verified",
      detail: available
        ? "Sign a one-time wallet message to verify ownership."
        : "Wallet sign-in is not configured.",
    },
    github: {
      status: "unavailable",
      label: "Verify wallet first",
    },
    permissions: {
      chat: false,
      claim: false,
      vote: false,
    },
  };
}

export function authenticatedWalletSession(input: {
  address: `0x${string}`;
  chainId: number;
  expiresAt: string;
}): WalletSessionView {
  return {
    version: walletAuthVersion,
    available: true,
    authenticated: true,
    address: input.address,
    chainId: input.chainId,
    expiresAt: input.expiresAt,
    admission: {
      status: "not_open",
      label: "Enrollment not open",
      detail: "Wallet ownership is verified. Builder admission and project permissions are not live yet.",
    },
    github: {
      status: "not_linked",
      label: "GitHub not linked",
    },
    permissions: {
      chat: false,
      claim: false,
      vote: false,
    },
  };
}
