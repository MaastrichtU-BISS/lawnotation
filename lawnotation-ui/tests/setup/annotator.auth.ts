import { test as setup, expect } from "@playwright/test";

const annotatorFile = "playwright/.auth/annotator.json";

setup("Authenticate as annotator", async ({ context, page }) => {
  setup.setTimeout(90_000);
  await page.goto("/");
  const emailField = page.getByTestId("email-field-to-login");
  await expect(emailField).toBeVisible();
  await page.waitForLoadState("networkidle");
  await emailField.fill("annotator@example.com");
  await page.getByRole("button", { name: /send code/i }).click();
  await page.waitForSelector('[data-test="verify-button"]', {
    state: "visible",
  });
  const verifyBtn = page.getByTestId("verify-button");
  await expect(verifyBtn).toBeVisible();

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  const magicLinkPage = await context.newPage();
  await magicLinkPage.goto("http://127.0.0.1:54324/m/annotator", {
    waitUntil: "domcontentloaded",
  });

  // Wait for the email to arrive; re-query after each reload to avoid stale locators.
  await expect.poll(
    async () => {
      await magicLinkPage.reload({ waitUntil: "domcontentloaded" });
      return await magicLinkPage.getByText("Your login code for").count();
    },
    { timeout: 90_000, intervals: [1000, 2000, 3000, 5000] },
  ).toBeGreaterThan(0);

  const mailEntry = magicLinkPage.getByText("Your login code for").first();
  await mailEntry.click();

  const loginCode = magicLinkPage.locator("#login-code");
  await expect(loginCode).toHaveText(/\S+/, { timeout: 30_000 });
  const magicCode = ((await loginCode.textContent()) ?? "").trim();
  await expect(magicCode).not.toEqual("");

  await page.getByRole("textbox").first().fill(magicCode);
  await page.getByTestId("verify-button").click();

  await page.getByText("Create new project").waitFor();
  await page.getByText("Create new project").isVisible();

  await page.context().storageState({ path: annotatorFile });
});