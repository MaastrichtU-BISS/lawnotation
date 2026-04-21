import { test as setup, expect } from "@playwright/test";

const annotatorFile = "playwright/.auth/annotator.json";

setup("Authenticate as annotator", async ({ context, page }) => {
  setup.setTimeout(90_000);

  const email = "annotator@example.com";

  console.log("Starting annotator auth flow");

  await page.goto("/");

  const emailField = page.getByTestId("email-field-to-login");
  await expect(emailField).toBeVisible();

  await emailField.fill(email);
  console.log("Filled email:", email);

  const otpLoginResponsePromise = page.waitForResponse((response) => {
    const url = response.url();
    return (
      url.includes("/trpc/user.otpLogin") ||
      url.includes("/api/trpc/user.otpLogin")
    );
  });

  await page.getByRole("button", { name: /send code/i }).click();
  console.log("Triggered OTP request");

  const otpLoginResponse = await otpLoginResponsePromise;

  const otpBody = await otpLoginResponse.text().catch(() => "<unavailable>");
  console.log("OTP response status:", otpLoginResponse.status());
  console.log("OTP response body:", otpBody);

  if (!otpLoginResponse.ok()) {
    throw new Error(
      `OTP request failed: ${otpLoginResponse.status()} → ${otpBody}`
    );
  }

  const verifyBtn = page.getByTestId("verify-button");
  await expect(verifyBtn).toBeVisible();

  console.log("Waiting for email in Mailpit...");

  const mailpitApiUrl =
    "http://127.0.0.1:54324/api/v1/messages?limit=20";

  let magicCode = "";

  for (let i = 0; i < 30; i++) {
    console.log(`Poll attempt ${i + 1}`);

    const response = await page.request.get(mailpitApiUrl);

    if (!response.ok()) {
      console.log("Mailpit API failed:", response.status());
      await page.waitForTimeout(1000);
      continue;
    }

    const data = await response.json();
    const messages = data.messages ?? [];

    console.log(`Total messages: ${messages.length}`);

    const annotatorMessages = messages.filter((m: any) =>
      m.To?.some((t: any) => t.Address === email)
    );

    console.log(`Annotator messages: ${annotatorMessages.length}`);

    if (annotatorMessages.length > 0) {
      const latest = annotatorMessages[0];

      console.log("Latest message subject:", latest.Subject);
      console.log("Latest message snippet:", latest.Snippet);
      console.log("Created at:", latest.Created);

      const snippet = latest.Snippet || "";
      const match = snippet.match(/\b\d{6}\b/);

      if (match) {
        magicCode = match[0];
        console.log("OTP extracted:", magicCode);
        break;
      } else {
        console.log("No OTP found in snippet");
      }
    } else {
      console.log("No messages for annotator yet");
    }

    await page.waitForTimeout(1000);
  }

  if (!magicCode) {
    console.log("No OTP received after polling Mailpit");

    const debugRes = await page.request.get(mailpitApiUrl);
    const debugData = await debugRes.json();

    console.log("FULL MAILPIT DUMP:");
    console.log(JSON.stringify(debugData, null, 2));

    throw new Error("OTP email never arrived in Mailpit");
  }

  await page.getByRole("textbox").first().fill(magicCode);
  await verifyBtn.click();

  await page.getByText("Create new project").waitFor();
  await expect(page.getByText("Create new project")).toBeVisible();

  console.log("Auth successful, saving session");

  await page.context().storageState({ path: annotatorFile });
});