import { test as setup, expect } from "@playwright/test";
const annotatorFile = "playwright/.auth/annotator.json";
setup("Authenticate as annotator", async ({ context, page, request }) => {
  setup.setTimeout(120_000);
  const email = "annotator@example.com";
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
  let message: Record<string, unknown> | null = null;
  await expect.poll(
    async () => {
      const res = await request.get("http://127.0.0.1:54324/api/v1/messages");
      if (!res.ok()) return false;
      const data = await res.json().catch(() => null);
      if (!Array.isArray(data)) return false;

      const found = data.find((m: any) =>
        m.To?.some((to: string) => to.includes(email))
      );
      if (!found) return false;

      message = found as Record<string, unknown>;
      return true;
    },
    { timeout: 90_000, intervals: [1000, 2000, 3000, 5000] }
  ).toBeTruthy();

  const body = String(message?.["Text"] ?? message?.["HTML"] ?? "");
  const codeMatch = body.match(/\b\d{6}\b/);
  const magicCode = codeMatch?.[0] ?? "";
  expect(magicCode).not.toEqual("");
  await page.getByRole("textbox").first().fill(magicCode);
  await page.getByTestId("verify-button").click();
  await expect(page.getByText("Create new project")).toBeVisible({ timeout: 60_000 });
  await page.context().storageState({ path: annotatorFile });
});