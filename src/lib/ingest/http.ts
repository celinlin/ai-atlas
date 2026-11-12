export const USER_AGENT = process.env.INGEST_USER_AGENT || "AIAtlasBot/1.0 (+news aggregation; respects robots and feed terms)";

export async function fetchText(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 20_000);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "user-agent": USER_AGENT, accept: "application/rss+xml, application/atom+xml, application/xml, application/json, text/xml;q=0.9, */*;q=0.8", ...(init.headers ?? {}) },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } catch (e) {
    const err = e as Error & { cause?: { message?: string; code?: string } };
    const cause = err.cause?.code || err.cause?.message;
    throw new Error(err.name === "AbortError" ? `timeout fetching ${url}` : cause ? `${err.message} (${cause})` : err.message);
  } finally {
    clearTimeout(timer);
  }
}
