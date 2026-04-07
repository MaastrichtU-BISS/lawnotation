import { test, expect } from "@playwright/test";

test("Not logged in user can search documents and download results", async ({
  page,
}) => {
  test.setTimeout(120000);

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const apiFailures: string[] = [];
  const rechtspraakButton = page.getByRole("button", {
    name: /^Rechtspraak$/i,
  });
  const echrButton = page.getByRole("button", { name: /^ECHR$/i });
  const cjeuButton = page.getByRole("button", { name: /^CJEU$/i });

  const ignoredPageErrors = [/^dataOptions\.call is not a function$/i];

  const shouldIgnore = (msg: string) =>
    ignoredPageErrors.some((re) => re.test(msg));

  page.on("pageerror", (err) => {
    if (!shouldIgnore(err.message)) pageErrors.push(err.message);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error" && !shouldIgnore(msg.text())) {
      consoleErrors.push(msg.text());
    }
  });

  page.on("response", (res) => {
    if (
      res.url().includes("archive.getXMLFromRechtspraak") &&
      res.status() >= 400
    ) {
      apiFailures.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.goto("/archives", { waitUntil: "networkidle" });

  await expect(page.getByText("Dataset")).toBeVisible();
  await expect(rechtspraakButton).toBeEnabled();
  await expect(echrButton).toBeDisabled();
  await expect(cjeuButton).toBeDisabled();

  const searchButton = page.getByRole("button", {
    name: /^Search Documents$/i,
  });
  const resetButton = page.getByRole("button", { name: /^Reset$/i });
  const successMsg = page.locator(".success-message");

  const runSearchAndExpectZipDownload = async () => {
    await expect(searchButton).toBeEnabled();
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      searchButton.click(),
    ]);
    await expect
      .poll(() => download.suggestedFilename())
      .toMatch(/documents\.zip$/i);
    await expect(searchButton).toBeEnabled();
  };

  const resetAndEnterKeyword = async (keyword: string) => {
    await resetButton.click();
    await keywordsInput.fill(keyword);
    await keywordsInput.press("Enter");
  };

  const getFetchedCount = async () => {
    const text = await successMsg.textContent();
    return parseInt(text!.match(/(\d+) document/)?.[1] ?? "0");
  };


  await expect(searchButton).toBeDisabled();

  await expect(page.getByText("Keywords *", { exact: true })).toBeVisible();
  const keywordsInput = page.getByPlaceholder("Type and press Enter");
  await expect(keywordsInput).toBeEditable();

  await keywordsInput.fill("pokemon");
  await keywordsInput.press("Enter");
  await runSearchAndExpectZipDownload();

  await expect(successMsg).toBeVisible({ timeout: 10000 });
  const unfilteredCount = await getFetchedCount();
  expect(unfilteredCount).toBeGreaterThan(0);

  await resetAndEnterKeyword("pokemon");

  const instancesToggle = page.getByRole("button", { name: /Instances/i });
  await instancesToggle.click();
  const hogeRaadCheckbox = page
    .locator(".hierarchical-checkboxes .checkbox-label", {
      hasText: /^Hoge Raad$/i,
    })
    .locator("input[type='checkbox']")
    .first();
  await hogeRaadCheckbox.check();
  await runSearchAndExpectZipDownload();

  await expect(successMsg).toBeVisible({ timeout: 10000 });
  const filteredCount = await getFetchedCount();
  expect(filteredCount).toBeGreaterThan(0);
  expect(filteredCount).toBeLessThan(unfilteredCount);

  await resetAndEnterKeyword("pokemon");
  await instancesToggle.click();

  const domainsToggle = page.getByRole("button", { name: /Domains/i });
  await domainsToggle.click();
  const bestuursrechtCheckbox = page
    .locator(".hierarchical-checkboxes .checkbox-label", {
      hasText: /bestuursrecht/i,
    })
    .locator("input[type='checkbox']")
    .first();
  await bestuursrechtCheckbox.check();
  await runSearchAndExpectZipDownload();

  await expect(successMsg).toBeVisible({ timeout: 10000 });
  const domainFilteredCount = await getFetchedCount();
  expect(domainFilteredCount).toBeGreaterThan(0);
  expect(domainFilteredCount).toBeLessThan(unfilteredCount);

  await resetAndEnterKeyword("pokemon");

  const advancedSettingsToggle = page.getByRole("button", {
    name: /Advanced Settings/i,
  });
  await advancedSettingsToggle.click();

  const degreesSourceInput = page.locator("#degreesSource");
  await expect(degreesSourceInput).toBeEditable();
  await degreesSourceInput.fill("1");

  const opinionsCheckbox = page.getByRole("checkbox", { name: /Opinion/i });
  await expect(opinionsCheckbox).toBeVisible();
  await opinionsCheckbox.check();
  await runSearchAndExpectZipDownload();

  await expect(successMsg).toBeVisible({ timeout: 10000 });
  const advancedFilteredCount = await getFetchedCount();
  expect(advancedFilteredCount).toBeGreaterThan(0);

  await resetButton.click();

  await expect(page.getByText("ECLIs * (comma-separated)", { exact: true })).toBeVisible();
  const eclisInput = page.getByRole("textbox", { name: /ECLIs/i });
  await expect(eclisInput).toBeEditable();
  await eclisInput.fill("ECLI:NL:RBLIM:2023:7197");
  await eclisInput.press("Enter");
  await runSearchAndExpectZipDownload();

  await expect(
    pageErrors,
    `Unhandled page errors:\n${pageErrors.join("\n")}`,
  ).toEqual([]);
  await expect(
    consoleErrors,
    `Console errors:\n${consoleErrors.join("\n")}`,
  ).toEqual([]);
  await expect(apiFailures, `API failures:\n${apiFailures.join("\n")}`).toEqual(
    [],
  );
});
