export const QUERY_FAMILIES = {
  youtube_primary_footage: [
    "full police interrogation confession",
    "full suspect interview interrogation",
    "recorded police interview murder trial",
    "jury views interrogation video",
    "bodycam confession interrogation",
    "custodial interrogation video",
    "defendant police interview trial exhibit"
  ],
  courtlistener_suppression: [
    '"motion to suppress" "recorded interview"',
    '"motion to suppress" confession Miranda',
    '"custodial interrogation" video',
    '"defendant\'s statement" "video recording"',
    '"law enforcement interview" recording',
    '"trial exhibit" interrogation'
  ],
  public_records: [
    '"police interrogation" "public records request"',
    '"recorded interview" "public records request"',
    '"body camera footage" confession',
    '"interview room" "public records"'
  ],
  court_media: [
    '"jury views" "interrogation video"',
    '"interrogation video" "trial" "jury"',
    '"police interview" "played in court"',
    '"defendant interview" "Court TV"'
  ]
} as const;

export type QueryFamily = keyof typeof QUERY_FAMILIES;

export function getQueriesForFamily(family: QueryFamily): string[] {
  return [...QUERY_FAMILIES[family]];
}

