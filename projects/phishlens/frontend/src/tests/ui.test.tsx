import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import LoginPage from "../pages/LoginPage"

describe("LoginPage", () => {
  it("renders sign-in with reset access", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /forgot password/i })).toBeInTheDocument()
  })
})
