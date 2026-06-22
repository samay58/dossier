"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRequests } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

export default function RequestsPage() {
  const requests = useQuery({ queryKey: ["records-requests"], queryFn: fetchRequests });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-4xl font-semibold">Requests</h1>
        <p className="mt-2 text-sm text-muted-foreground">Drafts stay local until a human submits them outside the app.</p>
      </div>
      <Panel>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="h-11 px-3">Agency</th>
                <th className="h-11 px-3">Type</th>
                <th className="h-11 px-3">Status</th>
                <th className="h-11 px-3">Submitted</th>
                <th className="h-11 px-3">Fee</th>
              </tr>
            </thead>
            <tbody>
              {(requests.data ?? []).map((request) => (
                <tr key={request.id} className="border-t border-border align-top">
                  <td className="px-3 py-3 font-medium">{request.agencyName}</td>
                  <td className="px-3 py-3">{request.requestType.replaceAll("_", " ")}</td>
                  <td className="px-3 py-3"><Badge tone="warn">{request.status}</Badge></td>
                  <td className="px-3 py-3">{request.submittedAt ?? "Not submitted"}</td>
                  <td className="px-3 py-3">{request.feeEstimate ? `$${request.feeEstimate}` : "None"}</td>
                </tr>
              ))}
              {requests.data?.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={5}>No request drafts yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

