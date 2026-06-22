"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { createRequestDraft } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function DraftRequestButton({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => createRequestDraft({ caseId, requestType: "court_clerk", feeCapDollars: 50 }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["records-requests"] });
    }
  });

  return (
    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      <FileText data-icon="inline-start" aria-hidden="true" />
      {mutation.isPending ? "Drafting" : "Draft records request"}
    </Button>
  );
}

