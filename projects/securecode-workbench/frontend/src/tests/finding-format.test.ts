import { describe, expect, it } from "vitest"

function locationLabel(path: string, line: number): string {
  return `${path}:${line}`
}

describe("finding location labels", () => {
  it("formats path:line stably", () => {
    expect(locationLabel("src/app.py", 42)).toBe("src/app.py:42")
    expect(locationLabel("a/b.ts", 0)).toBe("a/b.ts:0")
  })
})
