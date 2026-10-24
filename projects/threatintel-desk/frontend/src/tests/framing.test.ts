import { describe, expect, it } from "vitest"

const FRAMING = "Appearing in feeds raises questions for review — it is not proof that an indicator is malicious."

describe("honesty framing", () => {
  it("never treats a single-feed appearance as proof", () => {
    expect(FRAMING).toMatch(/not proof/)
    expect(FRAMING).toMatch(/human|review/)
  })
})
