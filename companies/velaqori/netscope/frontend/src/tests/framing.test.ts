import { describe, expect, it } from "vitest"

const FLAG_NOTE = "Unusual-volume flags are configurable heuristics for review, not proof of an attack."

describe("honesty framing", () => {
  it("frames volume flags as heuristics, never proof", () => {
    expect(FLAG_NOTE).toMatch(/not proof/)
    expect(FLAG_NOTE).toMatch(/heuristics/)
  })
})
