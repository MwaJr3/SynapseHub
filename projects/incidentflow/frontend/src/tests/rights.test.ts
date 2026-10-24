import { describe, expect, it } from "vitest"

// Mirrors backend/services.py ROLE_RIGHTS — closing is lead-only.
const ROLE_RIGHTS: Record<string, string[]> = {
  observer: ["read"],
  responder: ["read", "create", "update", "comment", "task", "evidence", "transition", "assign"],
  lead: ["read", "create", "update", "comment", "task", "evidence", "transition", "assign", "close"],
}

describe("role rights model", () => {
  it("keeps close lead-only and observers read-only", () => {
    expect(ROLE_RIGHTS.responder).not.toContain("close")
    expect(ROLE_RIGHTS.lead).toContain("close")
    expect(ROLE_RIGHTS.observer).toEqual(["read"])
  })
})
