import { test as setup, expect } from "@playwright/test";

const editorFile = "playwright/.auth/editor.json";

setup("Authenticate as editor", async ({ context, page }) => {
  setup.setTimeout(90_000);

  await page.goto("/");
  const emailField = page.getByTestId("email-field-to-login");
  await expect(emailField).toBeVisible();
  await page.waitForLoadState("networkidle");
  await emailField.fill("editor@example.com");
  await page.getByRole("button", { name: /send code/i }).click();
  const verifyBtn = page.getByTestId("verify-button");
  await verifyBtn.waitFor();
  await expect(verifyBtn).toBeVisible();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const magicLinkPage = await context.newPage();
  await magicLinkPage.goto("http://127.0.0.1:54324/m/editor");
  await magicLinkPage.getByRole("button", { name: "" }).click();
  await magicLinkPage.getByText("Your login code for").first().click();
  const magicCode = await magicLinkPage.locator("#login-code").innerText();
  await page.getByRole("textbox").first().fill(magicCode);
  await verifyBtn.click();
  await page.getByText("Create new project").waitFor();
  await expect(page.getByText("Create new project")).toBeVisible();

  await page.context().storageState({ path: editorFile });
});
