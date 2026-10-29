import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import LoginPage from "../pages/LoginPage"

describe("LoginPage", () => {
  it("renders sign-in and role selection on register", async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    await screen.getByRole("button", { name: /need an account/i }).click()
    expect(screen.getByRole("option", { name: /incident lead/i })).toBeInTheDocument()
  })
})
