import { describe, expect, it } from "vitest";
import { createSeedSweep } from "./seed-data";

describe("createSeedSweep", () => {
  it("creates a usable first demo queue for jury views interrogation video", () => {
    const sweep = createSeedSweep("jury views interrogation video");

    expect(sweep.queryRun.query).toBe("jury views interrogation video");
    expect(sweep.sourceHits.length).toBeGreaterThanOrEqual(5);
    expect(sweep.candidates[0]?.score.overallPriorityScore).toBeGreaterThan(
      sweep.candidates.at(-1)?.score.overallPriorityScore ?? 100
    );
    expect(sweep.candidates.some((candidate) => candidate.recommendedNextAction === "watch_now")).toBe(true);
    expect(sweep.candidates.some((candidate) => candidate.recommendedNextAction === "reject")).toBe(true);
  });
});

