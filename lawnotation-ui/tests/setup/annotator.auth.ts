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

  const mailEntry = magicLinkPage.getByText("Your login code for").first();
  const hasMailEntry = await mailEntry.isVisible({ timeout: 10000 }).catch(() => false);
  if (!hasMailEntry) {
    await magicLinkPage.reload({ waitUntil: "domcontentloaded" });
  }

  await expect(mailEntry).toBeVisible({ timeout: 30000 });
  await mailEntry.click();

  const loginCode = magicLinkPage.locator("#login-code");
  await expect(loginCode).toBeVisible({ timeout: 30000 });
  const magicCode = (await loginCode.innerText()).trim();
  await expect(magicCode).not.toEqual("");
  await page.getByRole("textbox").first().fill(magicCode);
  await page.getByTestId("verify-button").click();
  await page.getByText("Create new project").waitFor();
  await page.getByText("Create new project").isVisible();
  await page.context().storageState({ path: annotatorFile });
});
