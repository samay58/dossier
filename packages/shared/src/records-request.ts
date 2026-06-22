export type RecordsRequestDraftInput = {
  requestType: "state_public_records" | "foia" | "court_clerk" | "media_license" | "other";
  caseName: string;
  defendantName: string;
  agencyName?: string;
  agencyJurisdiction?: string;
  courtName?: string;
  incidentNumber?: string;
  caseNumber?: string;
  feeCapDollars: number;
};

export type RecordsRequestDraft = {
  status: "draft";
  subject: string;
  body: string;
  knownIdentifiersUsed: string[];
  missingIdentifiers: string[];
  riskNotes: string[];
};

function compactIdentifier(label: string, value: string | undefined): string | null {
  return value ? `${label}: ${value}` : null;
}

export function generateRecordsRequestDraft(input: RecordsRequestDraftInput): RecordsRequestDraft {
  const knownIdentifiersUsed = [
    compactIdentifier("Case", input.caseName),
    compactIdentifier("Defendant or suspect", input.defendantName),
    compactIdentifier("Incident number", input.incidentNumber),
    compactIdentifier("Case number", input.caseNumber),
    compactIdentifier("Agency", input.agencyName),
    compactIdentifier("Jurisdiction", input.agencyJurisdiction),
    compactIdentifier("Court", input.courtName)
  ].filter((value): value is string => Boolean(value));

  const missingIdentifiers = [
    input.incidentNumber ? null : "incident number",
    input.caseNumber ? null : "case number",
    input.agencyName || input.requestType === "court_clerk" ? null : "agency name"
  ].filter((value): value is string => Boolean(value));

  if (input.requestType === "court_clerk") {
    return {
      status: "draft",
      subject: `Request for Trial Exhibit or Media Record: ${input.caseName}, ${input.caseNumber ?? "case number unknown"}`,
      body: [
        "Hello,",
        "",
        `I am seeking information about how to obtain a copy of a trial exhibit or media record in ${input.caseName}, ${input.caseNumber ?? "case number unknown"}, ${input.courtName ?? "the court"}, involving ${input.defendantName}.`,
        "",
        "Specifically, I am looking for any publicly available audio/video exhibit containing a recorded police interview, suspect interview, interrogation, or confession reportedly played or referenced during proceedings.",
        "",
        "Could you please advise:",
        "",
        "1. Whether the exhibit is available for public inspection or copying.",
        "2. The procedure for requesting a copy.",
        "3. Any required forms, fees, or media-copy rules.",
        "4. Whether a transcript is available if the media itself is not.",
        "",
        "I am not requesting sealed, juvenile, or restricted material. If the record is unavailable, any docket entry or exhibit-list reference identifying the item would be helpful.",
        "",
        `Please notify me before fees exceed $${input.feeCapDollars}.`,
        "",
        "Thank you."
      ].join("\n"),
      knownIdentifiersUsed,
      missingIdentifiers,
      riskNotes: ["Human approval is required before submission."]
    };
  }

  return {
    status: "draft",
    subject: `Public Records Request: Recorded Suspect Interview Materials, ${input.caseName}`,
    body: [
      "Hello,",
      "",
      `I am requesting copies of lawfully releasable public records related to ${input.caseName}${input.incidentNumber ? `, incident number ${input.incidentNumber}` : ""}, involving ${input.defendantName}, investigated by ${input.agencyName ?? "your agency"}.`,
      "",
      "Please provide electronic copies of the following, limited to releasable non-exempt records:",
      "",
      `1. Audio or video recordings of any custodial interview, suspect interview, interrogation, or confession of ${input.defendantName}.`,
      "2. Any transcript of those interviews.",
      "3. Any Miranda waiver form or rights advisement form associated with those interviews.",
      "4. Any exhibit list, evidence inventory entry, or report page identifying those recordings.",
      "",
      "If any portion of the requested records is exempt from disclosure, please release any reasonably segregable non-exempt portions. If redactions are required, please provide the statutory basis for each category of withholding.",
      "",
      "Please provide records electronically where possible.",
      `Please notify me before fees exceed $${input.feeCapDollars}.`,
      "",
      "Thank you."
    ].join("\n"),
    knownIdentifiersUsed,
    missingIdentifiers,
    riskNotes: ["Human approval is required before submission."]
  };
}

