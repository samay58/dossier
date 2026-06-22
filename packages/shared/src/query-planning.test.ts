import { describe, expect, it } from "vitest";
import { createQueryPlan } from "./query-planning";

describe("query planning", () => {
  it("expands one research prompt into source-specific planned queries", () => {
    const plan = createQueryPlan({
      originalQuery: "jury views interrogation video",
      family: "court_media",
      sources: ["seed", "youtube", "courtlistener", "muckrock"]
    });

    expect(plan.plannedQueries).toHaveLength(9);
    expect(plan.plannedQueries.filter((query) => query.source === "youtube")).toHaveLength(3);
    expect(plan.plannedQueries.filter((query) => query.source === "courtlistener")).toHaveLength(3);
    expect(plan.plannedQueries.filter((query) => query.source === "muckrock")).toHaveLength(3);
  });

  it("uses media language for YouTube and keeps reject hints attached", () => {
    const plan = createQueryPlan({
      originalQuery: "jury views interrogation video",
      family: "court_media",
      sources: ["youtube"]
    });

    expect(plan.plannedQueries.map((query) => query.query)).toEqual([
      "jury views interrogation video",
      "full police interrogation trial",
      "defendant police interview played in court"
    ]);
    expect(plan.plannedQueries[0]?.rejectHints).toEqual(expect.arrayContaining(["reaction", "body language", "reenactment"]));
  });

  it("uses court-record language for CourtListener", () => {
    const plan = createQueryPlan({
      originalQuery: "jury views interrogation video",
      family: "court_media",
      sources: ["courtlistener"]
    });
    const plannedText = plan.plannedQueries.map((query) => query.query).join(" ");

    expect(plannedText).toContain("motion to suppress");
    expect(plannedText).toContain("Miranda");
    expect(plannedText).toContain("recorded statement");
    expect(plannedText).toContain("trial exhibit");
  });

  it("uses public-records language for MuckRock and avoids broad media phrasing", () => {
    const plan = createQueryPlan({
      originalQuery: "jury views interrogation video",
      family: "court_media",
      sources: ["muckrock"]
    });
    const plannedText = plan.plannedQueries.map((query) => query.query).join(" ");

    expect(plannedText).toContain("public records");
    expect(plannedText).toContain("police department");
    expect(plannedText).not.toContain("jury views interrogation video");
    expect(plan.plannedQueries.every((query) => query.intent === "public_records_request")).toBe(true);
  });
});
