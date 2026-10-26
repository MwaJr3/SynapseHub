import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import ArchitecturePage from "../pages/ArchitecturePage"

describe("ArchitecturePage", () => {
  it("documents the hard security boundaries", () => {
    render(<MemoryRouter><ArchitecturePage /></MemoryRouter>)
    expect(screen.getByText(/never executed/i)).toBeInTheDocument()
    expect(screen.getAllByText(/not proof/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/explicit per-run consent/i)).toBeInTheDocument()
  })
})
