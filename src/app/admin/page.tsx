import type { Metadata } from "next";
import { RunIngestButton } from "@/components/profile/run-ingest";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Container } from "@/components/ui/section";
import { adminMode, isAdmin } from "@/lib/admin-auth";
import { llmEnabled } from "@/lib/classify/llm";
import { repo } from "@/lib/data";
import { formatDate } from "@/lib/i18n/labels";
import { getDictionary } from "@/lib/i18n/server";
import { PROVIDERS } from "@/lib/ingest/pipeline";
import { configuredFeeds } from "@/lib/ingest/sources";
import { adminLogin, adminLogout } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { t, locale } = await getDictionary();
  const mode = adminMode();
  const ok = await isAdmin();
  if (!ok)
    return (
      <Container className="max-w-md pt-20">
        <h1 className="font-display mb-6 text-4xl text-ink">{t.admin.title}</h1>
        {mode === "locked" ? (
          <p className="text-muted">Set ADMIN_TOKEN to enable the admin console.</p>
        ) : (
          <form action={adminLogin} className="space-y-3">
            <label className="block text-[13px] text-muted" htmlFor="token">{t.admin.login}</label>
            <input id="token" name="token" type="password" required className="h-11 w-full rounded-xl border border-line bg-surface px-4 outline-none focus:border-line-strong" />
            {(await searchParams).error && <p className="text-[13px] text-warning">{t.admin.unauthorized}</p>}
            <Button variant="primary" type="submit">{t.admin.enter}</Button>
          </form>
        )}
      </Container>
    );

  const [status, jobs] = await Promise.all([repo().status(), repo().listJobs(25)]);
  const feeds = configuredFeeds();
  const card = "rounded-2xl border border-line bg-surface p-5";
  return (
    <Container className="pb-24 pt-10 md:pt-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[40px] leading-none text-ink">{t.admin.title}</h1>
        <div className="flex items-center gap-2">
          <RunIngestButton />
          {mode === "token" && <form action={adminLogout}><Button size="sm" variant="ghost" type="submit">Log out</Button></form>}
        </div>
      </div>
      {mode === "dev-open" && <p className="mb-6 rounded-xl bg-warning-soft px-4 py-3 text-[13px] text-warning">{t.admin.devOpen}</p>}

      <div className="grid gap-4 md:grid-cols-4">
        <div className={card}><p className="eyebrow">{t.admin.backend}</p><p className="mt-2 text-lg text-ink">{status.backend === "postgres" ? "PostgreSQL" : "Local JSON store"}</p></div>
        <div className={card}><p className="eyebrow">{t.admin.status}</p><p className="mt-2 text-lg text-ink">{status.demo ? t.admin.demo : t.admin.live}</p></div>
        <div className={card}><p className="eyebrow">{t.admin.articles}</p><p className="mt-2 text-lg text-ink tabular">{status.realArticles}</p></div>
        <div className={card}><p className="eyebrow">{t.admin.lastIngest}</p><p className="mt-2 text-lg text-ink">{status.lastIngestAt ? formatDate(status.lastIngestAt, locale, true) : "—"}</p></div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="eyebrow mb-3">{t.admin.providers}</h2>
          <ul className="divide-y divide-line">
            {PROVIDERS.map((p) => {
              const s = p.enabled();
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                  <span className="text-ink">{p.label}</span>
                  <span className="flex items-center gap-2 text-right text-[12.5px] text-muted">{s.reason}<Tag tone={s.enabled ? "accent" : "default"}>{s.enabled ? t.admin.enabled : t.admin.disabled}</Tag></span>
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
              <span className="text-ink">{t.admin.llm}</span>
              <span className="flex items-center gap-2 text-[12.5px] text-muted">{llmEnabled() ? process.env.LLM_MODEL || "claude-opus-5-5" : "ANTHROPIC_API_KEY not set"}<Tag tone={llmEnabled() ? "accent" : "default"}>{llmEnabled() ? t.admin.enabled : t.admin.disabled}</Tag></span>
            </li>
          </ul>
        </section>
        <section className={card}>
          <h2 className="eyebrow mb-3">{t.admin.feeds} · {feeds.length}</h2>
          <ul className="max-h-72 divide-y divide-line overflow-y-auto">
            {feeds.map((f) => (
              <li key={f.source.id} className="py-2 text-[13px]">
                <p className="text-ink">{f.source.name} <span className="text-muted">· {f.source.country ?? "—"} · {Math.round(f.source.reliability * 100)}</span></p>
                <p className="truncate text-[12px] text-muted">{f.feedUrl} — {f.terms}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="eyebrow mb-3">{t.admin.jobs}</h2>
        {jobs.length === 0 ? (
          <p className="text-[13.5px] text-muted">—</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="text-[11.5px] uppercase tracking-wider text-muted">
              <tr><th className="py-2 font-medium">Provider</th><th className="font-medium">Started</th><th className="font-medium">Status</th><th className="text-right font-medium">Fetched</th><th className="text-right font-medium">Inserted</th><th className="text-right font-medium">Dupes</th><th className="text-right font-medium">Rejected</th><th className="pl-4 font-medium">Errors</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {jobs.map((j) => (
                <tr key={j.id} className="align-top">
                  <td className="py-2 text-ink">{j.provider}</td>
                  <td className="text-muted">{formatDate(j.startedAt, locale, true)}</td>
                  <td><Tag tone={j.status === "success" ? "accent" : j.status === "failed" ? "warning" : "default"}>{j.status}</Tag></td>
                  <td className="text-right tabular">{j.fetched}</td>
                  <td className="text-right tabular">{j.inserted}</td>
                  <td className="text-right tabular">{j.duplicates}</td>
                  <td className="text-right tabular">{j.rejected}</td>
                  <td className="max-w-[360px] pl-4 text-[12px] text-muted">{j.errors.slice(0, 3).join(" · ") || "—"}{j.errors.length > 3 ? ` (+${j.errors.length - 3})` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Container>
  );
}
