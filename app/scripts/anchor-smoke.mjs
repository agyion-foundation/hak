/**
 * anchor-smoke.mjs — unit smoke test for app/lib/anchor.ts with a MOCK fetch.
 *
 * No network: a fake fetch implements the tr-mock-anchor endpoints and a fake
 * signer stands in for the wallet. Run: node scripts/anchor-smoke.mjs
 */

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const here = dirname(fileURLToPath(import.meta.url));
const libDir = join(here, "..", "app", "lib");
const outDir = join(tmpdir(), `anchor-smoke-${process.pid}`);
mkdirSync(outDir, { recursive: true });

// Transpile config.ts + anchor.ts (type-only imports are elided)
for (const name of ["config", "anchor"]) {
  const src = readFileSync(join(libDir, `${name}.ts`), "utf8");
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  writeFileSync(join(outDir, `${name}.js`), js);
}

// --- mock anchor server (in-process) ---------------------------------------

const ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const TOKEN = "mock.jwt.token";
let sawAuthHeader = false;

const routes = {
  "/sep6/info": () => ({
    deposit: { USDC: { enabled: true, authentication_required: true, fee_percent: 0.5, funding_methods: ["bank_account"] } },
    withdraw: { USDC: { enabled: true, authentication_required: true, fee_percent: 0.5 } },
  }),
  "/auth": (url) => ({ transaction: "challenge-xdr", network_passphrase: "Test SDF Network ; September 2015" }),
  "/sep6/deposit": (url) => ({
    id: "sep_dep_1",
    how: "Send TRY to IBAN TR050009900000000000000001 with reference TRMA-TEST",
    eta: 5,
    fee_percent: 0.5,
    instructions: {
      bank_name: { value: "TR Mock Bank A.Ş." },
      bank_account_number: { value: "TR050009900000000000000001" },
      external_transfer_memo: { value: "TRMA-TEST" },
    },
    extra_info: { message: "sandbox" },
  }),
  "/sep6/withdraw": () => ({
    id: "sep_wd_1",
    account_id: "GCLCZEQZ2THTEDAOFI66LACNPLY4OBKN7VKLEZFMBIHYKYQOW2W7T3Z6",
    memo: "687010851941",
    memo_type: "id",
    eta: 10,
    fee_percent: 0.5,
    extra_info: { message: "send USDC with memo", payment_uri: "web+stellar:pay?..." },
  }),
  "/sep6/transaction": () => ({
    transaction: { id: "sep_dep_1", kind: "deposit", status: "pending_user_transfer_start", amount_in: "1000" },
  }),
  "/sep38/price": (url) => {
    const decoded = decodeURIComponent(url);
    if (!decoded.includes("sell_amount=")) return { status: 400, body: { error: "provide exactly one of 'sell_amount' or 'buy_amount'" } };
    if (!decoded.includes(`stellar:USDC:${ISSUER}`)) return { status: 400, body: { error: "unknown buy_asset" } };
    return { total_price: "49.0", price: "48.79", sell_amount: "1000.00", buy_amount: "20.40", fee: { total: "4.98", asset: "iso4217:TRY" } };
  },
};

globalThis.fetch = async (input, init = {}) => {
  const raw = typeof input === "string" ? input : input.url;
  const url = new URL(raw);
  const path = url.pathname;

  if (path === "/auth" && init.method === "POST") {
    const body = JSON.parse(init.body);
    if (body.transaction !== "signed:challenge-xdr") {
      return resp(401, { type: "authentication_required", error: "bad signature" });
    }
    return resp(200, { token: TOKEN });
  }

  const route = routes[path];
  if (!route) return resp(404, { error: "no route" });

  // SEP-6 endpoints require the bearer token
  if (path.startsWith("/sep6/") && path !== "/sep6/info") {
    const auth = init.headers?.Authorization ?? (init.headers?.get?.("authorization"));
    if (auth !== `Bearer ${TOKEN}`) {
      return resp(401, { type: "authentication_required", error: "missing or invalid SEP-10 token" });
    }
    sawAuthHeader = true;
  }

  const out = route(raw);
  if (out?.status) return resp(out.status, out.body);
  return resp(200, out);
};

function resp(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
  };
}

// --- fake signer ------------------------------------------------------------

const signer = {
  address: async () => "GTESTACCOUNTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  signTransaction: async (xdr) => `signed:${xdr}`,
};

// --- run --------------------------------------------------------------------

const anchor = require(join(outDir, "anchor.js"));

let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? "ok" : "FAIL"}  ${name}`);
  if (!cond) failures++;
};

const info = await anchor.sep6Info();
check("sep6Info: deposit USDC enabled, 0.5% fee", info.deposit.USDC.enabled && info.deposit.USDC.fee_percent === 0.5);

const token = await anchor.authenticate(signer);
check("authenticate: returns token", token === TOKEN);
check("authenticate: caches token", (await anchor.authenticate(signer)) === TOKEN);

const dep = await anchor.depositTry(token, await signer.address(), "1000");
check("depositTry: id + iban + memo parsed", dep.id === "sep_dep_1" && dep.iban?.startsWith("TR05") && dep.transferMemo === "TRMA-TEST");
check("depositTry: bank name parsed", dep.bankName === "TR Mock Bank A.Ş.");

const wd = await anchor.withdrawTry(token, "20", "TR330006100519786457841326");
check("withdrawTry: account + memo parsed", wd.accountId.startsWith("GCLC") && wd.memo === "687010851941" && wd.memoType === "id");

const tx = await anchor.transactionStatus(token, "sep_dep_1");
check("transactionStatus: status parsed", tx.status === "pending_user_transfer_start" && tx.amountIn === "1000");

const price = await anchor.tryUsdcPrice("1000");
check("tryUsdcPrice: price + fee parsed", price.price === "48.79" && price.feeTotal === "4.98");

// error mapping: unauthenticated SEP-6 call -> AnchorError kind "auth"
let kind = null;
try {
  await anchor.depositTry("wrong-token", "GTEST", "1000");
} catch (e) {
  kind = e.kind;
}
check("error mapping: 401 -> AnchorError(auth)", kind === "auth");

// error mapping: unreachable anchor -> AnchorError kind "network"
const realFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("connect ECONNREFUSED"); };
kind = null;
try {
  await anchor.sep6Info();
} catch (e) {
  kind = e.kind;
}
globalThis.fetch = realFetch;
check("error mapping: network failure -> AnchorError(network)", kind === "network");

check("auth header was sent on SEP-6 calls", sawAuthHeader);

console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
