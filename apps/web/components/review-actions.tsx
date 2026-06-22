"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Search, X } from "lucide-react";
import { reviewCandidate } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function ReviewActions({ candidateId }: { candidateId: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (decision: string) =>
      reviewCandidate({
        candidateId,
        decision,
        reason: decision === "reject_no_primary_footage" ? "No primary footage found." : "Human review from dossier.",
        reviewer: "samay"
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
    }
  });

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => mutation.mutate("watch_now")} disabled={mutation.isPending}>
        <Check data-icon="inline-start" aria-hidden="true" />
        Watch now
      </Button>
      <Button size="sm" variant="outline" onClick={() => mutation.mutate("request_footage")} disabled={mutation.isPending}>
        <Search data-icon="inline-start" aria-hidden="true" />
        Request footage
      </Button>
      <Button size="sm" variant="secondary" onClick={() => mutation.mutate("reject_no_primary_footage")} disabled={mutation.isPending}>
        <X data-icon="inline-start" aria-hidden="true" />
        Reject
      </Button>
    </div>
  );
}

