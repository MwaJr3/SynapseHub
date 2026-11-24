/** Plain-language meaning of each verdict, so a label is never the only explanation. */
export const VERDICT_MEANING: Record<string, string> = {
  KNOWN_MALICIOUS: "At least one source reports this digest as known malware.",
  NO_KNOWN_DETECTION: "No source has flagged this digest. That is not proof the file is safe.",
  UNKNOWN: "No source has seen this digest, so there is nothing to compare against.",
  CONFLICTING: "Sources disagree. Review the provider results and decide manually.",
  UNAVAILABLE: "A lookup could not be completed (offline, disabled or errored). Try again later.",
}
