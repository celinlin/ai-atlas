"use client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/dictionaries";
import { supabaseBrowser } from "@/lib/supabase/client";
import { syncWithSupabase } from "@/lib/supabase/sync";

/** Optional Supabase magic-link sign-in. Hidden behind configuration. */
export function AccountCard() {
  const { t } = useI18n();
  const sb = supabaseBrowser();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) syncWithSupabase(sb, data.user.id).catch(() => {});
    });
    const { data } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="eyebrow mb-2">{t.profile.account}</h2>
      <p className="text-[13.5px] text-ink-2">{t.profile.localOnly}</p>
      {!sb ? (
        <p className="mt-3 text-[12.5px] text-muted">{t.profile.authUnavailable}</p>
      ) : user ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[13.5px] text-ink">{format(t.profile.signedInAs, { email: user.email ?? "" })}</p>
          <Button size="sm" onClick={() => sb.auth.signOut()}>{t.profile.signOut}</Button>
        </div>
      ) : sent ? (
        <p className="mt-4 text-[13.5px] text-positive">{t.profile.linkSent}</p>
      ) : (
        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/profile` } });
            if (error) setErr(error.message);
            else setSent(true);
          }}
        >
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.profile.email} aria-label={t.profile.email} className="h-10 min-w-0 flex-1 rounded-full border border-line bg-bg px-4 text-[14px] outline-none focus:border-line-strong" />
          <Button variant="primary" type="submit">{t.profile.sendLink}</Button>
        </form>
      )}
      {err && <p className="mt-2 text-[12.5px] text-warning">{err}</p>}
    </section>
  );
}
