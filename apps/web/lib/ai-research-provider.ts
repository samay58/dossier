import {
  EMPTY_EXTRACTED_SOURCE_PACKET,
  type AiExtractionResult,
  type ExtractedSourcePacket,
  type SourceFieldReference,
  type SourceHit,
  validateExtractedSourcePacket
} from "@interrogation/shared";

type FetchLike = (input: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export type AiExtractionInput = {
  sourceHit: SourceHit;
};

export type AiResearchProvider = {
  extractSourcePacket(input: AiExtractionInput): Promise<AiExtractionResult>;
};

function fieldRef(sourceHit: SourceHit, field: string): SourceFieldReference {
  return { sourceHitId: sourceHit.id, field };
}

function firstPersonName(text: string): string | null {
  const stopWords = new Set(["Full Police", "Police Interrogation", "Trial Jury", "Jury Requests", "Recorded Interview"]);
  const matches = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) ?? [];
  return matches.find((match) => !stopWords.has(match)) ?? null;
}

function claimTypeForSource(sourceType: SourceHit["sourceType"]) {
  if (sourceType === "muckrock") return "public_records_path";
  if (sourceType === "courtlistener") return "court_recording_reference";
  return "online_media_reference";
}

function validateResult(provider: AiExtractionResult["provider"], model: string | null, output: unknown): AiExtractionResult {
  const validation = validateExtractedSourcePacket(output);

  if (!validation.success) {
    return {
      taskType: "source_packet_extraction",
      status: "failed",
      provider,
      model,
      output: EMPTY_EXTRACTED_SOURCE_PACKET,
      error: validation.errors.join("; ")
    };
  }

  return {
    taskType: "source_packet_extraction",
    status: "succeeded",
    provider,
    model,
    output: validation.data,
    error: null
  };
}

function extractOpenAiText(body: unknown): string | null {
  const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  if (typeof record.output_text === "string") return record.output_text;

  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    const itemRecord = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
    const content = Array.isArray(itemRecord.content) ? itemRecord.content : [];
    for (const contentItem of content) {
      const contentRecord = typeof contentItem === "object" && contentItem !== null ? contentItem as Record<string, unknown> : {};
      if (typeof contentRecord.text === "string") return contentRecord.text;
    }
  }

  const choices = Array.isArray(record.choices) ? record.choices : [];
  const firstChoice = choices[0];
  const choiceRecord = typeof firstChoice === "object" && firstChoice !== null ? firstChoice as Record<string, unknown> : {};
  const message = typeof choiceRecord.message === "object" && choiceRecord.message !== null ? choiceRecord.message as Record<string, unknown> : {};
  return typeof message.content === "string" ? message.content : null;
}

const extractedValueSchema = {
  anyOf: [
    { type: "null" },
    {
      type: "object",
      additionalProperties: false,
      required: ["value", "provenance"],
      properties: {
        value: { type: "string" },
        provenance: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["sourceHitId", "field"],
            properties: {
              sourceHitId: { type: "string" },
              field: { type: "string" }
            }
          }
        }
      }
    }
  ]
};

const extractedSourcePacketSchema = {
  type: "object",
  additionalProperties: false,
  required: ["people", "caseCaption", "jurisdiction", "courtOrAgency", "docketNumber", "caseNumber", "eventDate", "claims"],
  properties: {
    people: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "role", "provenance"],
        properties: {
          name: { type: "string" },
          role: { type: ["string", "null"] },
          provenance: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["sourceHitId", "field"],
              properties: {
                sourceHitId: { type: "string" },
                field: { type: "string" }
              }
            }
          }
        }
      }
    },
    caseCaption: extractedValueSchema,
    jurisdiction: extractedValueSchema,
    courtOrAgency: extractedValueSchema,
    docketNumber: extractedValueSchema,
    caseNumber: extractedValueSchema,
    eventDate: extractedValueSchema,
    claims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "text", "status", "provenance"],
        properties: {
          type: {
            type: "string",
            enum: ["online_media_reference", "court_recording_reference", "public_records_path", "commentary_or_recap", "ethical_restriction"]
          },
          text: { type: "string" },
          status: {
            type: "string",
            enum: ["reasonable_inference", "speculative", "unsupported"]
          },
          provenance: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["sourceHitId", "field"],
              properties: {
                sourceHitId: { type: "string" },
                field: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
};

export function createMockAiResearchProvider(): AiResearchProvider {
  return {
    async extractSourcePacket({ sourceHit }) {
      const name = firstPersonName(sourceHit.title);
      const titleRef = fieldRef(sourceHit, "title");
      const packet: ExtractedSourcePacket = {
        ...EMPTY_EXTRACTED_SOURCE_PACKET,
        people: name ? [{ name, role: null, provenance: [titleRef] }] : [],
        courtOrAgency: sourceHit.authorOrChannel ? { value: sourceHit.authorOrChannel, provenance: [fieldRef(sourceHit, "authorOrChannel")] } : null,
        claims: [
          {
            type: claimTypeForSource(sourceHit.sourceType),
            text: "AI extraction identified a source-packet research lead from metadata.",
            status: "reasonable_inference",
            provenance: [titleRef]
          }
        ]
      };

      return validateResult("mock", "mock-ai-research-v1", packet);
    }
  };
}

export function createDisabledAiResearchProvider(reason: string): AiResearchProvider {
  return {
    async extractSourcePacket() {
      return {
        taskType: "source_packet_extraction",
        status: "skipped",
        provider: "disabled",
        model: null,
        output: EMPTY_EXTRACTED_SOURCE_PACKET,
        error: reason
      };
    }
  };
}

export function createOpenAiResearchProvider(options: {
  apiKey: string;
  model?: string;
  fetchImpl?: FetchLike;
}): AiResearchProvider {
  const model = options.model ?? "gpt-4.1-mini";
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async extractSourcePacket({ sourceHit }) {
      const input = {
        id: sourceHit.id,
        sourceType: sourceHit.sourceType,
        title: sourceHit.title,
        description: sourceHit.description,
        authorOrChannel: sourceHit.authorOrChannel,
        url: sourceHit.url,
        plannedQuery: sourceHit.plannedQuery,
        queryIntent: sourceHit.queryIntent,
        rawJson: sourceHit.rawJson
      };

      try {
        const response = await fetchImpl("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            input: [
              {
                role: "system",
                content: "Extract only cited research identifiers and claims from source metadata. Return null when a field is not stated. Never diagnose people, score body language, infer guilt, download media, or mark AI claims directly_supported_by_source."
              },
              {
                role: "user",
                content: JSON.stringify(input)
              }
            ],
            text: {
              format: {
                type: "json_schema",
                name: "source_packet_extraction",
                schema: extractedSourcePacketSchema,
                strict: true
              }
            }
          })
        });

        if (!response.ok) {
          return {
            taskType: "source_packet_extraction",
            status: "failed",
            provider: "openai",
            model,
            output: EMPTY_EXTRACTED_SOURCE_PACKET,
            error: `OpenAI source-packet extraction failed with status ${response.status}`
          };
        }

        const body = await response.json();
        const text = extractOpenAiText(body);
        if (!text) {
          return {
            taskType: "source_packet_extraction",
            status: "failed",
            provider: "openai",
            model,
            output: EMPTY_EXTRACTED_SOURCE_PACKET,
            error: "OpenAI response did not include output text"
          };
        }

        return validateResult("openai", model, JSON.parse(text));
      } catch (error) {
        return {
          taskType: "source_packet_extraction",
          status: "failed",
          provider: "openai",
          model,
          output: EMPTY_EXTRACTED_SOURCE_PACKET,
          error: error instanceof Error ? error.message : "OpenAI extraction failed"
        };
      }
    }
  };
}

export function createAiResearchProvider(options: {
  env: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
}): AiResearchProvider {
  if (!options.env.OPENAI_API_KEY) {
    return createDisabledAiResearchProvider("OPENAI_API_KEY is not configured.");
  }

  return createOpenAiResearchProvider({
    apiKey: options.env.OPENAI_API_KEY,
    model: options.env.OPENAI_RESEARCH_MODEL,
    fetchImpl: options.fetchImpl
  });
}
