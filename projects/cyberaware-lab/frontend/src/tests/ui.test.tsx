import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import LoginPage from "../pages/LoginPage"

describe("LoginPage", () => {
  it("renders sign-in form", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/account password/i)).toBeInTheDocument()
  })
})
