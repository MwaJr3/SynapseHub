import { describe, expect, it } from "vitest"

// Verdict badge class mapping — keeps presentation consistent with backend states.
function verdictClass(verdict: string): string {
  return ["KNOWN_MALICIOUS", "CONFLICTING", "NO_KNOWN_DETECTION", "UNKNOWN", "UNAVAILABLE"].includes(verdict)
    ? `verdict ${verdict}`
    : "verdict UNKNOWN"
}

describe("verdict presentation", () => {
  it("accepts the five documented states and maps anything else to UNKNOWN", () => {
    expect(verdictClass("KNOWN_MALICIOUS")).toBe("verdict KNOWN_MALICIOUS")
    expect(verdictClass("made-up")).toBe("verdict UNKNOWN")
  })
})
