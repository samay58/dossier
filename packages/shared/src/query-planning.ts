import type { SourceType } from "./types";

export type QueryIntent =
  | "online_primary_media"
  | "court_record_reference"
  | "suppression_or_miranda"
  | "trial_exhibit"
  | "public_records_request"
  | "negative_filter_probe";

export type PlannedQuerySource = Extract<SourceType, "youtube" | "courtlistener" | "muckrock">;

export type ExpectedEvidence =
  | "video_metadata"
  | "docket_reference"
  | "request_record"
  | "agency_identifier";

export type PlannedQuery = {
  id: string;
  source: PlannedQuerySource;
  query: string;
  intent: QueryIntent;
  priority: number;
  expectedEvidence: ExpectedEvidence[];
  rejectHints: string[];
};

export type QueryPlan = {
  id: string;
  originalQuery: string;
  family: string;
  plannedQueries: PlannedQuery[];
};

export type CreateQueryPlanInput = {
  originalQuery: string;
  family: string;
  sources: string[];
  maxQueriesPerSource?: number;
};

const REJECT_HINTS = [
  "reaction",
  "body language",
  "behavior analyst",
  "recap",
  "reenactment",
  "documentary",
  "podcast"
];

const PLAN_TEMPLATES: Record<PlannedQuerySource, Omit<PlannedQuery, "id" | "priority">[]> = {
  youtube: [
    {
      source: "youtube",
      query: "jury views interrogation video",
      intent: "online_primary_media",
      expectedEvidence: ["video_metadata"],
      rejectHints: REJECT_HINTS
    },
    {
      source: "youtube",
      query: "full police interrogation trial",
      intent: "online_primary_media",
      expectedEvidence: ["video_metadata"],
      rejectHints: REJECT_HINTS
    },
    {
      source: "youtube",
      query: "defendant police interview played in court",
      intent: "online_primary_media",
      expectedEvidence: ["video_metadata"],
      rejectHints: REJECT_HINTS
    }
  ],
  courtlistener: [
    {
      source: "courtlistener",
      query: "\"motion to suppress\" \"recorded interview\" Miranda",
      intent: "suppression_or_miranda",
      expectedEvidence: ["docket_reference"],
      rejectHints: ["media coverage", "news recap", "commentary"]
    },
    {
      source: "courtlistener",
      query: "\"recorded statement\" Miranda",
      intent: "court_record_reference",
      expectedEvidence: ["docket_reference"],
      rejectHints: ["media coverage", "news recap", "commentary"]
    },
    {
      source: "courtlistener",
      query: "\"trial exhibit\" \"recorded interview\"",
      intent: "trial_exhibit",
      expectedEvidence: ["docket_reference"],
      rejectHints: ["media coverage", "news recap", "commentary"]
    }
  ],
  muckrock: [
    {
      source: "muckrock",
      query: "\"recorded interview\" \"police department\"",
      intent: "public_records_request",
      expectedEvidence: ["request_record", "agency_identifier"],
      rejectHints: ["Court TV", "full interrogation", "reaction", "recap"]
    },
    {
      source: "muckrock",
      query: "\"interrogation video\" \"public records\"",
      intent: "public_records_request",
      expectedEvidence: ["request_record", "agency_identifier"],
      rejectHints: ["Court TV", "full interrogation", "reaction", "recap"]
    },
    {
      source: "muckrock",
      query: "\"Miranda\" \"recorded interview\" \"public records\"",
      intent: "public_records_request",
      expectedEvidence: ["request_record", "agency_identifier"],
      rejectHints: ["Court TV", "full interrogation", "reaction", "recap"]
    }
  ]
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "query-plan";
}

function sourcePlan(source: PlannedQuerySource, originalQuery: string, limit: number): PlannedQuery[] {
  return PLAN_TEMPLATES[source]
    .slice(0, limit)
    .map((template, index) => ({
      ...template,
      id: `${source}-${index + 1}-${slugify(template.query || originalQuery)}`,
      query: template.query,
      priority: index + 1
    }));
}

function isPlannedSource(source: string): source is PlannedQuerySource {
  return source === "youtube" || source === "courtlistener" || source === "muckrock";
}

export function createQueryPlan(input: CreateQueryPlanInput): QueryPlan {
  const limit = Math.max(1, input.maxQueriesPerSource ?? 3);
  const sources = input.sources.filter(isPlannedSource);
  const plannedQueries = sources.flatMap((source) => sourcePlan(source, input.originalQuery, limit));

  return {
    id: `query-plan-${slugify(input.family)}-${slugify(input.originalQuery)}`,
    originalQuery: input.originalQuery,
    family: input.family,
    plannedQueries
  };
}
