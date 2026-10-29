import { test, expect } from "@playwright/test"

const SHOTS = `${process.env.SCREENSHOT_DIR || "../../docs/screenshots/threatintel-desk"}`

test("account, analysis workflow, screenshots", async ({ page }) => {
  await page.goto("/login")
  await page.screenshot({ path: `${SHOTS}/01-login.png`, fullPage: true })
  await page.getByRole("button", { name: /register/i }).click()
  await page.getByPlaceholder("email").fill("e2e-threatintel-desk@training.example")
  await page.getByPlaceholder(/password/).fill("demo-password-123")
  await page.getByRole("button", { name: /register/i }).last().click()
  await expect(page).toHaveURL(/\/$|/)
  await page.screenshot({ path: `${SHOTS}/02-dashboard.png`, fullPage: true })
})
