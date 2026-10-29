import { describe, expect, it } from "vitest"

const BANNER = "TRAINING SIMULATION — this is a fictional exercise created for learning."

function mustShowBanner(content: string): boolean {
  return content.includes("TRAINING SIMULATION")
}

describe("training banner", () => {
  it("is required on every simulation view", () => {
    expect(mustShowBanner(BANNER)).toBe(true)
    expect(mustShowBanner("ordinary content without banner")).toBe(false)
  })
})
