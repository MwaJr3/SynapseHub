import { describe, expect, it } from "vitest"

const DISCLAIMER = "A suspicious pattern is NOT proof that a message is malicious, and the absence of warnings is NOT proof of safety."

describe("honesty framing", () => {
  it("never equates warnings with proof in either direction", () => {
    expect(DISCLAIMER).toMatch(/NOT proof/)
    expect(DISCLAIMER).toMatch(/NOT proof of safety/)
  })
})
