import { test, expect } from "@playwright/test";

test("Not logged in user goes to documentation and downloads an ECLI", async ({
  page,
}) => {
  test.setTimeout(120000);

  await page.goto("/archives");

  await expect(page.getByText("Provide ECLIs", { exact: true })).toBeVisible();
  const eclisInput = page.getByTestId("eclis").getByRole("textbox");
  console.log("Input value before:", await eclisInput.inputValue());
  await eclisInput.type("ECLI:NL:RBLIM:2023:7197,");
  console.log("Input value after:", await eclisInput.inputValue());
  await eclisInput.blur();
  console.log("After blur");
  console.log("Input value after blur:", await eclisInput.inputValue());
  await expect(page.getByText("ECLIs provided: 1")).toBeVisible();
  const downloadButton = page.getByTestId("download-button");
  await expect(downloadButton).toBeEnabled();
  await downloadButton.click();
  await expect(page.getByRole("alert")).toContainText(
    "One .zip file containing 1 documents has been downloaded!",
  );
});
