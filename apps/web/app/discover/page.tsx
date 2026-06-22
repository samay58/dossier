"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Play, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { NormalizedCandidate } from "@interrogation/shared";
import { fetchCandidates, runSweep } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

function scoreStatusLabel(status: NormalizedCandidate["scoreStatus"]) {
  return status === "verified_source" ? "Source supported" : "Metadata only";
}

function scoreStatusTone(status: NormalizedCandidate["scoreStatus"]) {
  return status === "verified_source" ? "good" : "warn";
}

function queryIntentLabel(intent: NormalizedCandidate["queryIntent"]) {
  if (!intent) return "Seed fixture";
  return intent.replaceAll("_", " ");
}

export default function DiscoverPage() {
  const queryClient = useQueryClient();
  const [activeQueryRunId, setActiveQueryRunId] = useState<string | null>(null);
  const candidates = useQuery({
    queryKey: ["candidates", activeQueryRunId],
    queryFn: () => fetchCandidates({ queryRunId: activeQueryRunId ?? undefined }),
    enabled: Boolean(activeQueryRunId)
  });
  const sweep = useMutation({
    mutationFn: () =>
      runSweep({
        query: "jury views interrogation video",
        queryFamily: "court_media",
        sources: ["seed", "youtube", "courtlistener", "muckrock"]
      }),
    onSuccess: (queryRun) => {
      setActiveQueryRunId(queryRun.id);
      void queryClient.invalidateQueries({ queryKey: ["candidates", queryRun.id] });
    }
  });

  const topCandidates = candidates.data?.slice(0, 3) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-normal">Discovery</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Query family: court media. Default query: jury views interrogation video.
          </p>
        </div>
        <Badge tone="good">
          <ShieldCheck aria-hidden="true" />
          Human review required
        </Badge>
      </div>

      <Panel className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Research sweep</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-[#FFFEFA] p-3">
                <div className="text-xs uppercase text-muted-foreground">Sources</div>
                <div className="mt-2 text-sm font-medium">Seed, YouTube, CourtListener, MuckRock</div>
              </div>
              <div className="rounded-md border border-border bg-[#FFFEFA] p-3">
                <div className="text-xs uppercase text-muted-foreground">Reject terms</div>
                <div className="mt-2 text-sm font-medium">reaction, recap, reenactment</div>
              </div>
              <div className="rounded-md border border-border bg-[#FFFEFA] p-3">
                <div className="text-xs uppercase text-muted-foreground">Storage</div>
                <div className="mt-2 text-sm font-medium">Links and metadata only</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => sweep.mutate()} disabled={sweep.isPending}>
              <Play data-icon="inline-start" aria-hidden="true" />
              {sweep.isPending ? "Running sweep" : "Run sweep"}
            </Button>
            {sweep.data ? <span className="text-sm text-muted-foreground">{sweep.data.resultCount} source hits stored</span> : null}
            {sweep.error ? <span className="text-sm text-destructive">{sweep.error.message}</span> : null}
          </div>
        </div>

        <div className="rounded-md bg-muted p-4">
          <div className="text-xs uppercase text-muted-foreground">Queue snapshot</div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div>
              <div className="font-mono text-2xl font-semibold">{candidates.data?.length ?? 0}</div>
              <div className="text-xs text-muted-foreground">Candidates</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-semibold">
                {candidates.data?.filter((candidate) => candidate.recommendedNextAction === "watch_now").length ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Watch</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-semibold">
                {candidates.data?.filter((candidate) => candidate.recommendedNextAction === "reject").length ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Reject</div>
            </div>
          </div>
          {sweep.data?.sourceResults ? (
            <div className="mt-5 flex flex-col gap-2">
              <div className="text-xs uppercase text-muted-foreground">Source status</div>
              {sweep.data.sourceResults.map((source) => (
                <div key={source.source} className="flex items-center justify-between gap-2 rounded-sm bg-white px-2 py-1 text-xs">
                  <span className="font-medium capitalize">{source.source}</span>
                  <span className={source.status === "succeeded" ? "text-[#24543B]" : source.status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                    {source.status} · {source.resultCount}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {sweep.data?.queryPlan ? (
            <div className="mt-5 flex flex-col gap-2">
              <div className="text-xs uppercase text-muted-foreground">Active plan</div>
              {sweep.data.queryPlan.plannedQueries.map((plannedQuery) => (
                <div key={plannedQuery.id} className="flex items-center justify-between gap-2 rounded-sm bg-white px-2 py-1 text-xs">
                  <span className="font-medium capitalize">{plannedQuery.source}</span>
                  <span className="truncate text-muted-foreground">{plannedQuery.intent.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        {topCandidates.map((candidate) => (
          <Link key={candidate.id} href={`/cases/${candidate.caseId}`} className="rounded-md border border-border bg-white p-4 shadow-soft hover:border-primary">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xl font-semibold">{candidate.score.overallPriorityScore}</span>
              <div className="flex flex-wrap justify-end gap-2">
                <Badge tone={scoreStatusTone(candidate.scoreStatus)}>{scoreStatusLabel(candidate.scoreStatus)}</Badge>
                <Badge tone={candidate.recommendedNextAction === "watch_now" ? "good" : "warn"}>
                  {candidate.recommendedNextAction.replaceAll("_", " ")}
                </Badge>
              </div>
            </div>
            <h3 className="mt-3 line-clamp-2 font-medium">{candidate.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{candidate.sourceName}</p>
            <p className="mt-1 text-xs text-muted-foreground">Found by {queryIntentLabel(candidate.queryIntent)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
