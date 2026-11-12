/** URL canonicalization + headline fingerprinting for duplicate detection. */

const TRACKING = /^(utm_|fbclid|gclid|mc_cid|mc_eid|ref|ref_src|cmpid|ito|xtor|guccounter|ocid|smid|taid)/i;

export function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase().replace(/^www\.|^amp\.|^m\./, "");
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
    u.searchParams.sort();
    let path = u.pathname.replace(/\/amp\/?$/, "/").replace(/\/+$/, "");
    if (!path) path = "/";
    return `${u.protocol === "http:" ? "https:" : u.protocol}//${u.hostname}${path}${u.search}`;
  } catch {
    return raw.trim();
  }
}

const STOP = new Set(
  "a an the and or of to in on for with by at from as is are was were be its it this that new says said after over into amid about how why what will can could le la les de des du un une et en pour sur avec par au aux dans est son sa ses".split(" "),
);

export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function titleFingerprint(title: string): string {
  return [...titleTokens(title)].sort().join(" ");
}

/** Two headlines describe the same story (syndication, light rewrites). */
export function isNearDuplicate(a: string, b: string, threshold = 0.72): boolean {
  return jaccard(titleTokens(a), titleTokens(b)) >= threshold;
}
