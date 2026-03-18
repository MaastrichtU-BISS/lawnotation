import { test, expect } from "@playwright/test";

test("Not logged in user goes to documentation and downloads an ECLI", async ({ page }) => {
  test.setTimeout(120000);

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const apiFailures: string[] = [];

  const ignoredPageErrors = [/^dataOptions\.call is not a function$/i];

  const shouldIgnore = (msg: string) => ignoredPageErrors.some((re) => re.test(msg));

  page.on("pageerror", (err) => {
    if (!shouldIgnore(err.message)) pageErrors.push(err.message);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error" && !shouldIgnore(msg.text())) {
      consoleErrors.push(msg.text());
    }
  });

  page.on("response", (res) => {
    if (res.url().includes("archive.getXMLFromRechtspraak") && res.status() >= 400) {
      apiFailures.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.goto("/archives", { waitUntil: "networkidle" });

  await expect(page.getByText("Provide ECLIs", { exact: true })).toBeVisible();

  const eclisInput = page.getByTestId("eclis").getByRole("textbox");
  await expect(eclisInput).toBeEditable();

  await eclisInput.fill("ECLI:NL:RBLIM:2023:7197");
  await eclisInput.press("Enter");

  const option = page.getByRole("option", { name: "ECLI:NL:RBLIM:2023:7197" }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  const counterLocator = page.getByText(/ECLIs provided:/);
  await expect(counterLocator).toContainText(/ECLIs provided:\s*1/);

  const downloadButton = page.getByTestId("download-button");
  await expect(downloadButton).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    downloadButton.click(),
  ]);

  await expect.poll(() => download.suggestedFilename()).not.toEqual("");

  await expect(counterLocator).toContainText(/ECLIs provided:\s*1/);

  await expect(pageErrors, `Unhandled page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  await expect(consoleErrors, `Console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
  await expect(apiFailures, `API failures:\n${apiFailures.join("\n")}`).toEqual([]);
});