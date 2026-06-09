import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const editorFile = "playwright/.auth/editor.json";
const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

setup("Authenticate as editor", async ({ page, request }) => {
  setup.setTimeout(90_000);

  const email = "editor@example.com";

  console.log("Starting editor auth flow");

  await page.goto("/auth/login", {
    waitUntil: "networkidle",
  });

  const emailField = page.getByTestId("email-field-to-login");
  const sendCodeBtn = page.getByRole("button", { name: /send code/i });

  await expect(emailField).toBeVisible();
  await expect(sendCodeBtn).toBeVisible();
  await expect(sendCodeBtn).toBeEnabled();

  await emailField.fill(email);
  await expect(emailField).toHaveValue(email);

  console.log("Filled email:", email);

  await sendCodeBtn.click();

  await expect(page.getByText("Enter the 6-digit code")).toBeVisible({
    timeout: 15_000,
  });

  const verifyBtn = page.getByRole("button", { name: /verify/i });

  await expect(verifyBtn).toBeVisible();
  await expect(verifyBtn).toBeEnabled();

  console.log("Waiting for email in Mailpit...");

  let magicCode = "";

  for (let i = 0; i < 30; i++) {
    console.log(`Poll attempt ${i + 1}`);

    const messagesResponse = await request.get(
      `${mailpitUrl}/api/v1/messages?limit=20`
    );

    if (!messagesResponse.ok()) {
      console.log("Mailpit API failed:", messagesResponse.status());
      await page.waitForTimeout(1000);
      continue;
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages ?? [];

    console.log(`Total messages: ${messages.length}`);

    const editorMessages = messages.filter((message: any) => {
      return message.To?.some((recipient: any) => {
        return recipient.Address === email;
      });
    });

    console.log(`Editor messages: ${editorMessages.length}`);

    if (editorMessages.length > 0) {
      const latest = editorMessages[0];

      console.log("Latest message subject:", latest.Subject);
      console.log("Latest message snippet:", latest.Snippet);
      console.log("Created at:", latest.Created);

      const messageId = latest.ID;

      const messageResponse = await request.get(
        `${mailpitUrl}/api/v1/message/${messageId}`
      );

      if (!messageResponse.ok()) {
        console.log("Mailpit message API failed:", messageResponse.status());
        await page.waitForTimeout(1000);
        continue;
      }

      const messageData = await messageResponse.json();

      const messageBody = [
        messageData.Subject,
        messageData.Snippet,
        messageData.Text,
        messageData.HTML,
      ]
        .filter(Boolean)
        .join("\n");

      const match = messageBody.match(/\b\d{6}\b/);

      if (match) {
        magicCode = match[0];
        console.log("OTP extracted:", magicCode);
        break;
      }

      console.log("No OTP found in message body");
    } else {
      console.log("No messages for editor yet");
    }

    await page.waitForTimeout(1000);
  }

  if (!magicCode) {
    console.log("No OTP received after polling Mailpit");

    const debugResponse = await request.get(
      `${mailpitUrl}/api/v1/messages?limit=50`
    );

    if (debugResponse.ok()) {
      const debugData = await debugResponse.json();

      console.log("FULL MAILPIT DUMP:");
      console.log(JSON.stringify(debugData, null, 2));
    }

    throw new Error("OTP email never arrived in Mailpit");
  }

  expect(magicCode).toHaveLength(6);

  const otpInputs = page.getByRole("textbox");

  await expect(otpInputs).toHaveCount(6);

  for (let i = 0; i < 6; i++) {
    await otpInputs.nth(i).fill(magicCode.charAt(i));
  }

  await verifyBtn.click();

  await expect(page.getByText("Create new project")).toBeVisible({
    timeout: 15_000,
  });

  console.log("Auth successful, saving session");

  mkdirSync(dirname(editorFile), { recursive: true });

  await page.context().storageState({
    path: editorFile,
  });
});