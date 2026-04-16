import { test as setup, expect } from "@playwright/test";

const annotatorFile = "playwright/.auth/annotator.json";

setup("Authenticate as annotator", async ({ context, page, request }) => {
  setup.setTimeout(120_000);

  const email = "annotator@example.com";
  const mailbox = email.split("@")[0];

  await page.goto("/");
  const emailField = page.getByTestId("email-field-to-login");
  await expect(emailField).toBeVisible();
  await emailField.fill(email);

  const otpLoginResponsePromise = page.waitForResponse((response) => {
    const url = response.url();
    return url.includes("/trpc/user.otpLogin") || url.includes("/api/trpc/user.otpLogin");
  });

  await page.getByRole("button", { name: /send code/i }).click();

  const otpLoginResponse = await otpLoginResponsePromise;
  expect(otpLoginResponse.ok()).toBeTruthy();

  await expect(page.getByTestId("verify-button")).toBeVisible();

  const messageId = await expect
    .poll(
      async () => {
        const res = await request.get(`http://127.0.0.1:54324/api/v1/mailbox/${mailbox}`);
        if (!res.ok()) return null;

        const data = await res.json().catch(() => null);
        const latest = Array.isArray(data) ? data[0] : null;
        return latest?.id ?? null;
      },
      { timeout: 90_000, intervals: [1000, 2000, 3000, 5000] },
    )
    .not.toBeNull();

  const magicLinkPage = await context.newPage();
  await magicLinkPage.goto(`http://127.0.0.1:54324/m/${mailbox}`, { waitUntil: "domcontentloaded" });

  await magicLinkPage.reload({ waitUntil: "domcontentloaded" });
  await expect(magicLinkPage.getByText("Your login code for")).toHaveCount(1, { timeout: 30_000 });
  await magicLinkPage.getByText("Your login code for").first().click();

  const loginCode = magicLinkPage.locator("#login-code");
  await expect(loginCode).toHaveText(/\S+/, { timeout: 30_000 });

  const magicCode = (await loginCode.textContent())?.trim() ?? "";
  expect(magicCode).not.toEqual("");

  await page.getByRole("textbox").first().fill(magicCode);
  await page.getByTestId("verify-button").click();

  await expect(page.getByText("Create new project")).toBeVisible({ timeout: 60_000 });

  await page.context().storageState({ path: annotatorFile });
});