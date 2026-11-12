"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function RunIngestButton() {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          try {
            const res = await fetch("/api/ingest", { method: "POST" });
            const d = await res.json();
            setMsg(res.ok ? (d.skipped ? d.reason : `${d.jobs.length} job(s) finished`) : d.error);
          } catch (e) {
            setMsg((e as Error).message);
          } finally {
            setBusy(false);
            router.refresh();
          }
        }}
      >
        {busy ? t.admin.running : t.admin.run}
      </Button>
      {msg && <span className="text-[13px] text-muted">{msg}</span>}
    </div>
  );
}
