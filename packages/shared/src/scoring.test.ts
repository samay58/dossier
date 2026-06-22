import { describe, expect, it } from "vitest";
import { computeCandidateScore } from "./scoring";

describe("computeCandidateScore", () => {
  it("prioritizes strong primary footage with lawful access", () => {
    const score = computeCandidateScore({
      primaryFootageScore: 20,
      interrogationArcScore: 15,
      psychologyRichnessScore: 12,
      sourcingScore: 15,
      structureScore: 8,
      avQualityScore: 8,
      ethicalSafetyScore: 10,
      uniquenessScore: 4,
      accessDifficultyScore: 10,
      penalties: []
    });

    expect(score.overallPriorityScore).toBeGreaterThanOrEqual(90);
    expect(score.jcsFitScore).toBeGreaterThanOrEqual(85);
  });

  it("applies hard penalties for reaction-only sources", () => {
    const score = computeCandidateScore({
      primaryFootageScore: 5,
      interrogationArcScore: 5,
      psychologyRichnessScore: 4,
      sourcingScore: 3,
      structureScore: 3,
      avQualityScore: 5,
      ethicalSafetyScore: 8,
      uniquenessScore: 1,
      accessDifficultyScore: 5,
      penalties: ["reaction_or_news_recap_only"]
    });

    expect(score.overallPriorityScore).toBe(0);
    expect(score.scoreExplanation).toContain("reaction/news recap");
  });

  it("does not reward body-language pseudoscience", () => {
    const score = computeCandidateScore({
      primaryFootageScore: 15,
      interrogationArcScore: 10,
      psychologyRichnessScore: 15,
      sourcingScore: 10,
      structureScore: 6,
      avQualityScore: 7,
      ethicalSafetyScore: 8,
      uniquenessScore: 3,
      accessDifficultyScore: 7,
      penalties: ["body_language_pseudoscience"]
    });

    expect(score.psychologyRichnessScore).toBe(10);
    expect(score.overallPriorityScore).toBeLessThan(80);
  });
});

