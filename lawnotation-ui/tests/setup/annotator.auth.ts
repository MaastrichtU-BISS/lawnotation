import { test as setup, expect } from "@playwright/test";

const annotatorFile = "playwright/.auth/annotator.json";

setup("Authenticate as annotator", async ({ page, request }) => {
  setup.setTimeout(90_000);

  const email = "annotator@example.com";

  console.log("Starting annotator auth flow");

  await page.goto("/auth/login", {
    waitUntil: "networkidle",
  });

  const emailField = page.getByTestId("email-field-to-login");
  const sendCodeBtn = page.getByTestId("login-button");

  await expect(emailField).toBeVisible();
  await expect(sendCodeBtn).toBeVisible();
  await expect(sendCodeBtn).toBeEnabled();

  await emailField.fill(email);
  await expect(emailField).toHaveValue(email);

  await sendCodeBtn.click();

  await expect(page.getByText("Enter the 6-digit code")).toBeVisible({
    timeout: 15_000,
  });

  const verifyBtn = page.getByRole("button", { name: "Verify" });

  await expect(verifyBtn).toBeVisible();
  await expect(verifyBtn).toBeEnabled();

  const mailpitResponse = await request.get(
    "http://127.0.0.1:54324/api/v1/messages",
  );

  expect(mailpitResponse.ok()).toBeTruthy();

  const mailpitData = await mailpitResponse.json();

  const message = mailpitData.messages.find((message: unknown) => {
    return JSON.stringify(message).includes(email);
  });

  expect(message).toBeTruthy();

  const messageId = message.ID;

  const messageResponse = await request.get(
    `http://127.0.0.1:54324/api/v1/message/${messageId}`,
  );

  expect(messageResponse.ok()).toBeTruthy();

  const messageData = await messageResponse.json();

  const messageBody = [messageData.Text, messageData.HTML, messageData.Subject]
    .filter(Boolean)
    .join("\n");

  const magicCodeMatch = messageBody.match(/\b\d{6}\b/);

  expect(magicCodeMatch).toBeTruthy();

  const magicCode = magicCodeMatch![0];

  expect(magicCode).toHaveLength(6);

  const otpInputs = page.getByRole("textbox");

  await expect(otpInputs).toHaveCount(6);

  for (let i = 0; i < 6; i++) {
    await otpInputs.nth(i).fill(magicCode.charAt(i));
  }

  await verifyBtn.click();

  await page.getByText("Create new project").waitFor({
    timeout: 15_000,
  });

  await expect(page.getByText("Create new project")).toBeVisible();

  console.log("Annotator auth successful, saving session");

  await page.context().storageState({
    path: annotatorFile,
  });
});
