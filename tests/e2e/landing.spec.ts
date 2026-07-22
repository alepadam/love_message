import { test, expect } from "@playwright/test";

// This is a smoke test only: it verifies the app builds and serves
// correctly. It intentionally does not click "Create a private space",
// since that calls /api/space, which needs real Supabase and Upstash
// credentials that CI does not have. Full end-to-end coverage of the
// create → open → popup flow should run against a preview deployment
// with real (test-project) credentials — see README "Testing" section.
test("landing page renders the core call to action", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sealed" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create a private space" })
  ).toBeVisible();
});
