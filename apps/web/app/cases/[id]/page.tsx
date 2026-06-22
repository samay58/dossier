import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { DraftRequestButton } from "@/components/draft-request-button";
import { ReviewActions } from "@/components/review-actions";
import { getWorkbenchRepository } from "@/lib/repository";
import type { NormalizedCandidate, StoredEvidenceClaim } from "@interrogation/shared";

function toneForRisk(risk: string) {
  if (risk === "low") return "good";
  if (risk === "high") return "danger";
  return "warn";
}

function scoreStatusLabel(status: NormalizedCandidate["scoreStatus"]) {
  return status === "verified_source" ? "Source supported" : "Metadata only";
}

function scoreStatusTone(status: NormalizedCandidate["scoreStatus"]) {
  return status === "verified_source" ? "good" : "warn";
}

function scoreStatusNote(status: NormalizedCandidate["scoreStatus"]) {
  return status === "verified_source"
    ? "Direct source metadata supports the core claim."
    : "Live metadata is enough for triage, but the footage claim still needs verification.";
}

function queryIntentLabel(intent: NormalizedCandidate["queryIntent"]) {
  if (!intent) return "Seed fixture";
  return intent.replaceAll("_", " ");
}

function claimStatusLabel(status: StoredEvidenceClaim["claimStatus"]) {
  if (status === "reasonable_inference") return "AI inferred";
  if (status === "speculative") return "Needs review";
  if (status === "unsupported") return "Unsupported";
  return "Source supported";
}

function claimStatusTone(status: StoredEvidenceClaim["claimStatus"]) {
  if (status === "reasonable_inference") return "warn";
  if (status === "speculative") return "info";
  if (status === "unsupported") return "danger";
  return "good";
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repository = getWorkbenchRepository();
  const caseRecord = await repository.getCase(id);

  if (!caseRecord) {
    notFound();
  }

  const candidates = await repository.listCaseCandidates(id);
  const claims = await repository.listCaseEvidenceClaims(id);
  const topCandidate = candidates[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold">{caseRecord.canonicalTitle}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {caseRecord.courtName ? <Badge tone="info">{caseRecord.courtName}</Badge> : null}
            {caseRecord.courtCaseNumber ? <Badge>{caseRecord.courtCaseNumber}</Badge> : null}
            {caseRecord.caseStatus ? <Badge tone="good">{caseRecord.caseStatus.replaceAll("_", " ")}</Badge> : null}
          </div>
        </div>
        <DraftRequestButton caseId={caseRecord.id} />
      </div>

      {topCandidate ? (
        <Panel className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs uppercase text-muted-foreground">JCS fit</div>
              <div className="mt-1 font-mono text-5xl font-semibold">{topCandidate.score.jcsFitScore}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={scoreStatusTone(topCandidate.scoreStatus)}>{scoreStatusLabel(topCandidate.scoreStatus)}</Badge>
                <span className="text-xs text-muted-foreground">{scoreStatusNote(topCandidate.scoreStatus)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs uppercase text-muted-foreground">Access</div>
                <div className="mt-2 text-sm font-medium">{topCandidate.accessPath.replaceAll("_", " ")}</div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs uppercase text-muted-foreground">Risk</div>
                <div className="mt-2">
                  <Badge tone={toneForRisk(topCandidate.ethicalRisk)}>{topCandidate.ethicalRisk}</Badge>
                </div>
              </div>
              <div className="col-span-2 rounded-md bg-muted p-3">
                <div className="text-xs uppercase text-muted-foreground">Found by</div>
                <div className="mt-2 text-sm font-medium">{queryIntentLabel(topCandidate.queryIntent)}</div>
                {topCandidate.plannedQuery ? <div className="mt-1 text-xs text-muted-foreground">{topCandidate.plannedQuery}</div> : null}
              </div>
            </div>
            <ReviewActions candidateId={topCandidate.id} />
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Why this is interesting</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{topCandidate.summary}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Primary footage</div>
                <div className="mt-1 text-sm font-medium">{topCandidate.footageTypes.join(", ")}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Sourcing</div>
                <div className="mt-1 text-sm font-medium">{topCandidate.sourcingConfidence}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Next action</div>
                <div className="mt-1 text-sm font-medium">{topCandidate.recommendedNextAction.replaceAll("_", " ")}</div>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <h2 className="font-serif text-2xl font-semibold">Source packet</h2>
          <div className="mt-4 flex flex-col gap-3">
            {candidates.flatMap((candidate) =>
              candidate.provenance.map((item) => (
                <a
                  key={`${candidate.id}-${item.url}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3 hover:border-primary"
                >
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.claimStatus.replaceAll("_", " ")}</div>
                  </div>
                  <ExternalLink aria-hidden="true" className="size-4 text-muted-foreground" />
                </a>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="font-serif text-2xl font-semibold">Access plan</h2>
          <ol className="mt-4 flex list-decimal flex-col gap-3 pl-5 text-sm leading-6 text-muted-foreground">
            <li>Check RECAP or docket references before paid retrieval.</li>
            <li>Use trial archive links to identify exhibit dates and media references.</li>
            <li>Contact the clerk for exhibit-list procedure if media is not online.</li>
            <li>Draft a narrow records request with known identifiers.</li>
          </ol>
        </Panel>
      </div>

      <Panel>
        <h2 className="font-serif text-2xl font-semibold">Extracted claims</h2>
        {claims.length ? (
          <div className="mt-4 grid gap-3">
            {claims.map((claim) => (
              <div key={claim.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium">{claim.text}</div>
                  <Badge tone={claimStatusTone(claim.claimStatus)}>{claimStatusLabel(claim.claimStatus)}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {claim.claimType.replaceAll("_", " ")} from {claim.provenance.map((item) => item.field).join(", ")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No AI extraction has run for this case yet.</p>
        )}
      </Panel>

      <Panel>
        <h2 className="font-serif text-2xl font-semibold">Candidate evidence</h2>
        <div className="mt-4 grid gap-3">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[80px_1fr_180px]">
              <div className="font-mono text-2xl font-semibold">{candidate.score.overallPriorityScore}</div>
              <div>
                <div className="font-medium">{candidate.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {candidate.score.scoreExplanation}
                </div>
                <div className="mt-2">
                  <Badge tone={scoreStatusTone(candidate.scoreStatus)}>{scoreStatusLabel(candidate.scoreStatus)}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Found by {queryIntentLabel(candidate.queryIntent)}
                  {candidate.plannedQuery ? `: ${candidate.plannedQuery}` : ""}
                </div>
              </div>
              <Badge tone={candidate.recommendedNextAction === "reject" ? "danger" : "good"}>{candidate.recommendedNextAction.replaceAll("_", " ")}</Badge>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
