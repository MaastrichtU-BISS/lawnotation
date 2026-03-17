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
  await magicLinkPage.goto("http://127.0.0.1:54324/m/annotator");
  await magicLinkPage.getByRole("button", { name: "" }).click();
  await magicLinkPage.getByText("Your login code for").first().click();
  const magicCode = await magicLinkPage.locator("#login-code").innerText();
  await page.getByRole("textbox").first().fill(magicCode);
  await page.getByTestId("verify-button").click();
  await page.getByText("Create new project").waitFor();
  await page.getByText("Create new project").isVisible();
  await page.context().storageState({ path: annotatorFile });
});
