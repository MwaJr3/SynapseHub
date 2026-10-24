import { describe, expect, it } from "vitest"

function summarizeRows(rows: Array<{ target: string; port: number; service: string }>): string[] {
  return rows.map((r) => `${r.target}:${r.port} (${r.service})`)
}

describe("diff row formatting", () => {
  it("renders stable target:port labels", () => {
    expect(summarizeRows([{ target: "10.0.0.5", port: 22, service: "ssh" }])).toEqual(["10.0.0.5:22 (ssh)"])
    expect(summarizeRows([])).toEqual([])
  })
})
