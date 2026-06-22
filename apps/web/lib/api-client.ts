import type { NormalizedCandidate, QueryRun } from "@interrogation/shared";
import type { StoredRecordsRequest, WorkbenchSettings } from "@/lib/repository";

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === "string" ? body.error : `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function runSweep(input: { query: string; queryFamily: string; sources: string[] }) {
  return fetchJson<QueryRun>("/api/sweeps", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchCandidates(input: { queryRunId?: string } = {}) {
  const params = input.queryRunId ? `?queryRunId=${encodeURIComponent(input.queryRunId)}` : "";
  const response = await fetchJson<{ candidates: NormalizedCandidate[] }>(`/api/candidates${params}`);
  return response.candidates;
}

export async function fetchRequests() {
  const response = await fetchJson<{ recordsRequests: StoredRecordsRequest[] }>("/api/records-requests");
  return response.recordsRequests;
}

export function fetchSettings() {
  return fetchJson<WorkbenchSettings>("/api/settings");
}

export function createRequestDraft(input: { caseId: string; requestType: string; feeCapDollars: number }) {
  return fetchJson<StoredRecordsRequest>("/api/records-requests/draft", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function reviewCandidate(input: { candidateId: string; decision: string; reason: string; reviewer: string }) {
  return fetchJson<NormalizedCandidate>(`/api/candidates/${input.candidateId}/review`, {
    method: "POST",
    body: JSON.stringify({
      decision: input.decision,
      reason: input.reason,
      reviewer: input.reviewer
    })
  });
}
