/**
 * format.ts — minor unit (stroop-benzeri, 7 ondalık) dönüşümleri ve TR gösterim
 */

import { CONFIG } from "./config";

const SCALE = 10n ** BigInt(CONFIG.decimals);

/** "12,5" / "12.5" gibi TR girdisini minor unit bigint'e çevirir. Negatif destekli. */
export function parseMinor(girdi: string): bigint {
  const s = girdi.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`Geçersiz tutar: "${girdi}"`);
  const neg = s.startsWith("-");
  const [tam, ond = ""] = s.replace("-", "").split(".");
  const ondPadded = (ond + "0".repeat(CONFIG.decimals)).slice(0, CONFIG.decimals);
  const v = BigInt(tam) * SCALE + BigInt(ondPadded || "0");
  return neg ? -v : v;
}

/** Minor unit bigint'i TR biçiminde gösterir: 12,5 → "12,5000000" yerine kısaltır */
export function formatMinor(v: bigint, maxOndalik = 2): string {
  const neg = v < 0n;
  const a = neg ? -v : v;
  const tam = a / SCALE;
  const ond = (a % SCALE).toString().padStart(CONFIG.decimals, "0").replace(/0+$/, "");
  const ondKisa = ond.slice(0, maxOndalik);
  const tamTr = tam.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${neg ? "-" : ""}${tamTr}${ondKisa ? "," + ondKisa : ""}`;
}

/** "4 dk 32 sn" / "1 sa 5 dk" tarzı kalan süre */
export function formatKalan(saniye: number): string {
  if (saniye <= 0) return "0 sn";
  const sa = Math.floor(saniye / 3600);
  const dk = Math.floor((saniye % 3600) / 60);
  const sn = saniye % 60;
  if (sa > 0) return `${sa} sa ${dk} dk ${sn} sn`;
  if (dk > 0) return `${dk} dk ${sn} sn`;
  return `${sn} sn`;
}

/** G... adresini kısalt: GABCD…WXYZ */
export function kisaAdres(a: string): string {
  return a.length > 12 ? `${a.slice(0, 5)}…${a.slice(-4)}` : a;
}
