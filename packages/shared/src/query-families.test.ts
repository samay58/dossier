import { describe, expect, it } from "vitest";
import { QUERY_FAMILIES, getQueriesForFamily } from "./query-families";

describe("query families", () => {
  it("includes the first demo query in the court media sweep", () => {
    expect(QUERY_FAMILIES.court_media).toContain('"jury views" "interrogation video"');
  });

  it("returns a defensive copy so callers cannot mutate canonical queries", () => {
    const queries = getQueriesForFamily("court_media");

    queries.push("mutated");

    expect(getQueriesForFamily("court_media")).not.toContain("mutated");
  });
});

