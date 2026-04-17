import { test as setup, expect } from "@playwright/test";

const annotatorFile = "playwright/.auth/annotator.json";

setup("Authenticate as annotator", async ({ context, page }) => {
  setup.setTimeout(90_000);

  await page.goto("/");

  const emailField = page.getByTestId("email-field-to-login");
  await expect(emailField).toBeVisible();
  await page.waitForLoadState("networkidle");

  const email = "annotator@example.com";
  await emailField.fill(email);

  const otpLoginResponsePromise = page.waitForResponse((response) => {
    const url = response.url();
    return (
      url.includes("/trpc/user.otpLogin") ||
      url.includes("/api/trpc/user.otpLogin")
    );
  });

  await page.getByRole("button", { name: /send code/i }).click();

  const otpLoginResponse = await otpLoginResponsePromise;
  if (!otpLoginResponse.ok()) {
    const bodyText = await otpLoginResponse.text().catch(() => "<unavailable>");
    throw new Error(
      `otpLogin failed with status ${otpLoginResponse.status()}: ${bodyText}`,
    );
  }

  const verifyBtn = page.getByTestId("verify-button");
  await verifyBtn.waitFor();
  await expect(verifyBtn).toBeVisible();

  await page.waitForTimeout(2000);

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  const magicLinkPage = await context.newPage();
  await magicLinkPage.goto("http://127.0.0.1:54324/m/annotator", {
    waitUntil: "domcontentloaded",
  });

  await expect
    .poll(
      async () => {
        await magicLinkPage.reload({ waitUntil: "domcontentloaded" });

        const entries = magicLinkPage.getByText("Your login code for");
        const count = await entries.count();

        if (count === 0) return false;

        return await entries.last().isVisible();
      },
      { timeout: 60_000, intervals: [1000, 2000, 3000, 5000] },
    )
    .toBe(true);

  const mailEntry = magicLinkPage.getByText("Your login code for").last();
  await mailEntry.click();

  const loginCode = magicLinkPage.locator("#login-code");
  await expect(loginCode).toHaveText(/\S+/, { timeout: 30_000 });

  const magicCode = ((await loginCode.textContent()) ?? "").trim();
  await expect(magicCode).not.toEqual("");

  await page.getByRole("textbox").first().fill(magicCode);
  await verifyBtn.click();

  await page.getByText("Create new project").waitFor();
  await expect(page.getByText("Create new project")).toBeVisible();

  await page.context().storageState({ path: annotatorFile });
});