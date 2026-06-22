import type { CandidatePenalty, CandidateScore, CandidateScoreInput } from "./types";

const PENALTY_VALUES: Record<CandidatePenalty, number> = {
  reenactment_only: -100,
  no_primary_footage: -50,
  reaction_or_news_recap_only: -40,
  minor_without_approval: -30,
  active_case: -25,
  graphic_private_victim_material: -20,
  no_source_provenance: -20,
  unclear_heavily_edited_repost: -15,
  diagnosis_heavy_commentary: -10,
  body_language_pseudoscience: -10
};

const PENALTY_LABELS: Record<CandidatePenalty, string> = {
  reenactment_only: "reenactment only",
  no_primary_footage: "no primary footage",
  reaction_or_news_recap_only: "reaction/news recap only",
  minor_without_approval: "minor material without approval",
  active_case: "active case",
  graphic_private_victim_material: "graphic or private victim material",
  no_source_provenance: "no source provenance",
  unclear_heavily_edited_repost: "unclear heavily edited repost",
  diagnosis_heavy_commentary: "diagnosis-heavy commentary",
  body_language_pseudoscience: "body-language pseudoscience"
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function applyPenalties(penalties: CandidatePenalty[]): Record<CandidatePenalty, number> {
  return penalties.reduce<Record<CandidatePenalty, number>>((accumulator, penalty) => {
    accumulator[penalty] = PENALTY_VALUES[penalty];
    return accumulator;
  }, {} as Record<CandidatePenalty, number>);
}

export function computeCandidateScore(input: CandidateScoreInput): CandidateScore {
  const penaltiesJson = applyPenalties(input.penalties);
  const penaltyTotal = Object.values(penaltiesJson).reduce((sum, value) => sum + value, 0);
  const psychologyRichnessScore = input.penalties.includes("body_language_pseudoscience")
    ? Math.max(0, input.psychologyRichnessScore - 5)
    : input.psychologyRichnessScore;

  const weightedBase =
    input.primaryFootageScore * 1.25 +
    input.interrogationArcScore * 1.2 +
    psychologyRichnessScore * 1.15 +
    input.sourcingScore * 1.1 +
    input.structureScore * 0.8 +
    input.avQualityScore * 0.7 +
    input.ethicalSafetyScore * 1.0 +
    input.uniquenessScore * 0.5 +
    input.accessDifficultyScore * 0.8;

  const jcsFitScore = clamp(
    Math.round(
      input.primaryFootageScore +
        input.interrogationArcScore +
        psychologyRichnessScore +
        input.sourcingScore +
        input.structureScore +
        input.avQualityScore +
        input.ethicalSafetyScore +
        input.uniquenessScore
    )
  );

  const overallPriorityScore = clamp(Math.round(weightedBase + penaltyTotal));
  const penaltyText = input.penalties.length
    ? ` Penalties applied: ${input.penalties.map((penalty) => PENALTY_LABELS[penalty]).join(", ")}.`
    : " No hard penalties applied.";

  return {
    primaryFootageScore: input.primaryFootageScore,
    interrogationArcScore: input.interrogationArcScore,
    psychologyRichnessScore,
    sourcingScore: input.sourcingScore,
    structureScore: input.structureScore,
    avQualityScore: input.avQualityScore,
    ethicalSafetyScore: input.ethicalSafetyScore,
    uniquenessScore: input.uniquenessScore,
    accessDifficultyScore: input.accessDifficultyScore,
    jcsFitScore,
    overallPriorityScore,
    scoreExplanation: `Weighted priority score is ${overallPriorityScore}. JCS fit score is ${jcsFitScore}.${penaltyText}`,
    penalties: input.penalties,
    penaltiesJson
  };
}

