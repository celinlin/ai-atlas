"use client";
import { useEffect } from "react";
import { actions } from "@/lib/store/atlas-store";
import type { Article } from "@/lib/types";

/** Records a read for the passport and radar affinity. Renders nothing. */
export function TrackRead({ article }: { article: Pick<Article, "id" | "countries" | "industries" | "contentType"> }) {
  useEffect(() => {
    actions.recordRead(article);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);
  return null;
}

export function TrackCountry({ code }: { code: string }) {
  useEffect(() => actions.exploreCountry(code), [code]);
  return null;
}
