import { test as setup, expect } from "@playwright/test";

const editorFile = "playwright/.auth/editor.json";

setup("Authenticate as editor", async ({ context, page }) => {
  setup.setTimeout(90_000);

  await page.goto("/");

  const emailField = page.getByTestId("email-field-to-login");
  await expect(emailField).toBeVisible();
  await page.waitForLoadState("networkidle");

  const email = "editor@example.com";
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
  await expect(verifyBtn).toBeVisible();

  const mailpitApiUrl =
    "http://127.0.0.1:54324/api/v1/messages?limit=20";

  let magicCode = "";

  for (let i = 0; i < 30; i++) {
    const response = await page.request.get(mailpitApiUrl);

    if (response.ok()) {
      const data = await response.json();
      const messages = data.messages ?? [];

      const editorMessages = messages.filter((m: any) =>
        m.To?.some((t: any) => t.Address === email)
      );

      if (editorMessages.length > 0) {
        const latest = editorMessages[0];

        const snippet = latest.Snippet || "";

        const match = snippet.match(/\b\d{6}\b/);

        if (match) {
          magicCode = match[0];
          break;
        }
      }
    }

    await page.waitForTimeout(1000);
  }

  await expect(magicCode).not.toEqual("");

  await page.getByRole("textbox").first().fill(magicCode);
  await verifyBtn.click();
  await page.getByText("Create new project").waitFor();
  await expect(page.getByText("Create new project")).toBeVisible();

  await page.context().storageState({ path: editorFile });
});