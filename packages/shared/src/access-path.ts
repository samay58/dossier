import type { AccessPath, AvailabilityStatus, SourceType } from "./types";

export type AccessPathInput = {
  sourceType: SourceType;
  sourceName: string;
  availabilityStatus: AvailabilityStatus;
  isOfficialAgencyUpload: boolean;
  isTrialArchive: boolean;
  mentionsDocketExhibit: boolean;
  mentionsSuppressionMotion: boolean;
  hasMuckRockFulfillment: boolean;
  hasEthicalRestriction: boolean;
};

export function classifyAccessPath(input: AccessPathInput): AccessPath {
  if (input.hasEthicalRestriction) {
    return "sealed_or_restricted";
  }

  if (input.hasMuckRockFulfillment) {
    return "muckrock_existing_request";
  }

  if (input.isOfficialAgencyUpload && input.availabilityStatus === "online_full") {
    return "online_full";
  }

  if (input.availabilityStatus === "online_partial") {
    return "online_partial";
  }

  if (input.isTrialArchive) {
    return "court_archive";
  }

  if (input.mentionsDocketExhibit) {
    return "court_clerk_request";
  }

  if (input.mentionsSuppressionMotion) {
    return "recap_or_pacer";
  }

  if (input.availabilityStatus === "needs_public_records_request") {
    return "agency_public_records_request";
  }

  if (input.sourceType === "muckrock") {
    return "muckrock_new_request";
  }

  if (input.sourceType === "court_tv" || input.sourceType === "law_crime") {
    return "media_license_required";
  }

  return "unknown";
}

