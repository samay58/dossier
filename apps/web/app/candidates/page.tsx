"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { CandidateTable } from "@/components/candidate-table";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { fetchCandidates, runSweep } from "@/lib/api-client";

export default function CandidatesPage() {
  const queryClient = useQueryClient();
  const candidates = useQuery({ queryKey: ["candidates"], queryFn: () => fetchCandidates() });
  const sweep = useMutation({
    mutationFn: () => runSweep({ query: "jury views interrogation video", queryFamily: "court_media", sources: ["seed"] }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
    }
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl font-semibold">Candidates</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ranked by primary footage, source confidence, access path, and guardrail penalties.</p>
        </div>
        <Button onClick={() => sweep.mutate()} disabled={sweep.isPending}>
          <Play data-icon="inline-start" aria-hidden="true" />
          {sweep.isPending ? "Running" : "Seed queue"}
        </Button>
      </div>
      <Panel>
        <CandidateTable candidates={candidates.data ?? []} />
      </Panel>
    </div>
  );
}
