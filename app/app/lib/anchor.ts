/**
 * anchor.ts — client for the official hackathon TR mock anchor
 *
 *   Anchor:  https://tr-mock-anchor.fly.dev  (stellar.toml verified)
 *   Rail:    TRY <-> USDC (Circle testnet issuer, see CONFIG.assetAddress)
 *   SEP-10   /auth    — web authentication; required by every SEP-6 endpoint
 *   SEP-6    /sep6    — programmatic deposit/withdraw (this anchor has NO SEP-24)
 *   SEP-38   /sep38   — indicative TRY/USDC prices (fee = 0.5% spread over mid)
 *   SEP-12   /sep12   — KYC (the sandbox auto-accepts; no PII leaves the browser)
 *
 * Funding method: bank_account only (FAST/EFT simulated by the sandbox).
 *
 * Verified quirks of this mock anchor:
 *   - SEP-6 endpoints are classic GET-with-query-params; there is NO
 *     POST /sep6/deposit route (returns 404). We use GET accordingly.
 *   - SEP-10 accepts unfunded testnet accounts (no on-chain account needed).
 *   - /sep38/price requires exactly one of sell_amount / buy_amount.
 */

import { CONFIG } from "./config";
import type { TransactionSigner } from "./hakClient";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type AnchorErrorKind = "network" | "http" | "anchor" | "auth";

export class AnchorError extends Error {
  kind: AnchorErrorKind;
  status?: number;

  constructor(kind: AnchorErrorKind, message: string, status?: number) {
    super(message);
    this.name = "AnchorError";
    this.kind = kind;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Types (SEP-6 / SEP-38 response shapes, trimmed to what the UI uses)
// ---------------------------------------------------------------------------

export interface Sep6AssetInfo {
  enabled: boolean;
  authentication_required: boolean;
  fee_percent?: number;
  funding_methods?: string[];
}

export interface Sep6Info {
  deposit: Record<string, Sep6AssetInfo>;
  withdraw: Record<string, Sep6AssetInfo>;
}

export interface DepositInstructions {
  id: string;
  /** Human-readable summary from the anchor ("Send TRY to IBAN ...") */
  how: string;
  eta?: number;
  feePercent?: number;
  bankName?: string;
  iban?: string;
  /** Reference the sender must write in the transfer description */
  transferMemo?: string;
  /** Sandbox hint (e.g. the simulate-transfer URL) */
  message?: string;
}

export interface WithdrawInstructions {
  id: string;
  /** Anchor Stellar account that receives the USDC payment */
  accountId: string;
  memo: string;
  memoType: string;
  eta?: number;
  feePercent?: number;
  message?: string;
  paymentUri?: string;
}

export interface TryUsdcPrice {
  /** TRY per USDC (net, after spread) */
  price: string;
  totalPrice: string;
  sellAmount: string;
  buyAmount: string;
  feeTotal: string;
  feeAsset: string;
}

export interface AnchorTransaction {
  id: string;
  kind: string;
  status: string;
  amountIn?: string;
  amountOut?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 15_000;

async function anchorFetch(path: string, token?: string): Promise<unknown> {
  const url = `${CONFIG.anchorUrl}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new AnchorError(
      "network",
      `Anchor unreachable (${CONFIG.anchorUrl}): ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body — handled below */
  }

  if (!res.ok) {
    const msg =
      (body as { error?: string | { message?: string } })?.error != null
        ? typeof (body as { error: unknown }).error === "string"
          ? ((body as { error: string }).error)
          : ((body as { error: { message?: string } }).error.message ?? res.statusText)
        : res.statusText;
    const kind: AnchorErrorKind = res.status === 401 || res.status === 403 ? "auth" : "anchor";
    throw new AnchorError(kind, `Anchor ${res.status}: ${msg}`, res.status);
  }
  return body;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

// ---------------------------------------------------------------------------
// SEP-6 info
// ---------------------------------------------------------------------------

/** GET /sep6/info — the anchor's capability sheet (no auth required). */
export async function sep6Info(): Promise<Sep6Info> {
  const body = (await anchorFetch("/sep6/info")) as Sep6Info;
  if (!body || typeof body !== "object" || !body.deposit) {
    throw new AnchorError("anchor", "Unexpected /sep6/info shape from the anchor");
  }
  return body;
}

// ---------------------------------------------------------------------------
// SEP-10 web authentication
// ---------------------------------------------------------------------------

/** In-memory token cache, keyed by account (tokens are short-lived JWTs). */
const tokenCache = new Map<string, string>();

/**
 * SEP-10 round trip:
 *   1. GET  /auth?account=G...      -> challenge transaction XDR
 *   2. sign the challenge with the active signer (kit or test secret)
 *   3. POST /auth {transaction}     -> JWT bearer token
 */
export async function authenticate(signer: TransactionSigner): Promise<string> {
  const account = await signer.address();
  const cached = tokenCache.get(account);
  if (cached) return cached;

  const challenge = (await anchorFetch(
    `/auth?account=${encodeURIComponent(account)}`,
  )) as { transaction?: string; network_passphrase?: string };
  if (!challenge.transaction || !challenge.network_passphrase) {
    throw new AnchorError("anchor", "SEP-10 challenge response is missing fields");
  }
  if (challenge.network_passphrase !== CONFIG.networkPassphrase) {
    throw new AnchorError(
      "anchor",
      `Anchor is on a different network (${challenge.network_passphrase})`,
    );
  }

  const signed = await signer.signTransaction(
    challenge.transaction,
    challenge.network_passphrase,
  );

  let res: Response;
  try {
    res = await fetch(`${CONFIG.anchorUrl}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: signed }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new AnchorError(
      "network",
      `Anchor unreachable during SEP-10 POST: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const body = (await res.json().catch(() => null)) as { token?: string; error?: string } | null;
  if (!res.ok || !body?.token) {
    throw new AnchorError(
      "auth",
      `SEP-10 rejected the signed challenge: ${body?.error ?? res.statusText}`,
      res.status,
    );
  }
  tokenCache.set(account, body.token);
  return body.token;
}

/** Drop the cached token (e.g. after a 401 or on wallet disconnect). */
export function clearAnchorSession(account?: string): void {
  if (account) tokenCache.delete(account);
  else tokenCache.clear();
}

// ---------------------------------------------------------------------------
// SEP-6 deposit (TRY in -> USDC out)
// ---------------------------------------------------------------------------

/**
 * Start a TRY deposit. The anchor replies with bank instructions (IBAN +
 * reference memo); the bank leg itself is simulated by the sandbox.
 *
 * Note: this anchor serves SEP-6 the classic way — GET with query params.
 */
export async function depositTry(
  token: string,
  account: string,
  amountTry: string,
): Promise<DepositInstructions> {
  const q = new URLSearchParams({
    asset_code: CONFIG.assetCode,
    account,
    type: "bank_account",
    amount: amountTry,
  });
  const body = (await anchorFetch(`/sep6/deposit?${q}`, token)) as Record<string, unknown>;
  if (!str(body.id)) throw new AnchorError("anchor", "Deposit response is missing an id");

  const instructions = (body.instructions ?? {}) as Record<string, { value?: string }>;
  const extra = (body.extra_info ?? {}) as { message?: string };
  return {
    id: str(body.id)!,
    how: str(body.how) ?? "",
    eta: num(body.eta),
    feePercent: num(body.fee_percent),
    bankName: instructions.bank_name?.value,
    iban: instructions.bank_account_number?.value,
    transferMemo: instructions.external_transfer_memo?.value,
    message: extra.message,
  };
}

// ---------------------------------------------------------------------------
// SEP-6 withdraw (USDC in -> TRY out)
// ---------------------------------------------------------------------------

/**
 * Start a withdrawal to a TRY bank account. The anchor replies with the
 * Stellar account + memo the USDC payment must carry; the payout leg is
 * simulated by the sandbox.
 */
export async function withdrawTry(
  token: string,
  amountUsdc: string,
  destIban: string,
): Promise<WithdrawInstructions> {
  const q = new URLSearchParams({
    asset_code: CONFIG.assetCode,
    type: "bank_account",
    amount: amountUsdc,
    dest: destIban,
  });
  const body = (await anchorFetch(`/sep6/withdraw?${q}`, token)) as Record<string, unknown>;
  if (!str(body.id) || !str(body.account_id)) {
    throw new AnchorError("anchor", "Withdraw response is missing id/account_id");
  }
  const extra = (body.extra_info ?? {}) as { message?: string; payment_uri?: string };
  return {
    id: str(body.id)!,
    accountId: str(body.account_id)!,
    memo: str(body.memo) ?? "",
    memoType: str(body.memo_type) ?? "",
    eta: num(body.eta),
    feePercent: num(body.fee_percent),
    message: extra.message,
    paymentUri: extra.payment_uri,
  };
}

/** GET /sep6/transaction?id=... — poll a deposit/withdraw status. */
export async function transactionStatus(
  token: string,
  id: string,
): Promise<AnchorTransaction> {
  const body = (await anchorFetch(`/sep6/transaction?id=${encodeURIComponent(id)}`, token)) as {
    transaction?: Record<string, unknown>;
  };
  const tx = body.transaction ?? {};
  return {
    id: str(tx.id) ?? id,
    kind: str(tx.kind) ?? "",
    status: str(tx.status) ?? "unknown",
    amountIn: str(tx.amount_in),
    amountOut: str(tx.amount_out),
    message: str(tx.message),
  };
}

// ---------------------------------------------------------------------------
// SEP-38 indicative price (TRY -> USDC)
// ---------------------------------------------------------------------------

/** Indicative TRY/USDC price for a given TRY amount (no auth required). */
export async function tryUsdcPrice(amountTry: string): Promise<TryUsdcPrice> {
  const q = new URLSearchParams({
    sell_asset: "iso4217:TRY",
    buy_asset: `stellar:${CONFIG.assetCode}:${CONFIG.assetAddress}`,
    sell_amount: amountTry,
  });
  const body = (await anchorFetch(`/sep38/price?${q}`)) as Record<string, unknown>;
  const fee = (body.fee ?? {}) as { total?: string; asset?: string };
  if (!str(body.price)) throw new AnchorError("anchor", "Unexpected /sep38/price shape");
  return {
    price: str(body.price)!,
    totalPrice: str(body.total_price) ?? str(body.price)!,
    sellAmount: str(body.sell_amount) ?? amountTry,
    buyAmount: str(body.buy_amount) ?? "",
    feeTotal: fee.total ?? "",
    feeAsset: fee.asset ?? "iso4217:TRY",
  };
}
