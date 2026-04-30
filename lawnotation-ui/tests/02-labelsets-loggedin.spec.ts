import { test, expect } from "@playwright/test";

test("Editor creates, edits, and deletes labelset", async ({ browser }) => {
  test.setTimeout(120000);
  const editorContext = await browser.newContext({
    storageState: "playwright/.auth/editor.json",
  });
  const editorPage = await editorContext.newPage();
  await editorPage.goto("/");
  await editorPage.getByTestId("labelset-link").waitFor();
  await editorPage.getByTestId("labelset-link").click();
  await editorPage.getByTestId("create-new-labelset").click();
  await editorPage.waitForLoadState("networkidle");
  await editorPage.locator(".dimmer-wrapper > .dimmer").waitFor({ state: "hidden" }).catch(() => {});
  await editorPage.getByTestId("labelset-name").fill("Test labelset");
  await editorPage
    .getByTestId("labelset-description")
    .fill("Labelset description");
  await editorPage.getByTestId("label-name").fill("First label");
  await editorPage.getByTestId("add-label").click();
  await expect(editorPage.getByText("First label")).toBeVisible();
  await editorPage.getByTestId("label-name").fill("Second label");
  await editorPage.getByTestId("add-label").click();
  await expect(editorPage.getByText("Second label")).toBeVisible();
  await editorPage.getByTestId("delete-label").last().click();
  await expect(editorPage.getByText("Second label")).not.toBeVisible();
  await editorPage.getByTestId("label-name").fill("Second label");
  await editorPage.getByTestId("add-label").click();
  await expect(editorPage.getByText("Second label")).toBeVisible();
  await editorPage.getByTestId("labelset-name").fill("Test labelset edited");
  await editorPage.getByTestId("save-labelset").click();
  // Wait for table to be visible and overlays to be gone
  const table = editorPage.getByRole("table");
  await table.waitFor({ state: "visible", timeout: 30000 });
  await editorPage.waitForLoadState("networkidle");
  await editorPage.locator(".dimmer-wrapper > .dimmer").waitFor({ state: "hidden" }).catch(() => {});
  // Confirm table is refreshed before checking row count
  await expect(table.locator("tbody").locator("tr")).toHaveCount(3, { timeout: 30000 });
  await editorPage.getByTestId("checkbox").first().check();
  await editorPage.getByTestId("remove-selected-rows").click();
  await editorPage.getByLabel("Yes, delete").click();
  // Wait for table to be visible and overlays to be gone
  await table.waitFor({ state: "visible", timeout: 30000 });
  await editorPage.waitForLoadState("networkidle");
  await editorPage.locator(".dimmer-wrapper > .dimmer").waitFor({ state: "hidden" }).catch(() => {});
  // Confirm table is refreshed before checking row count
  await expect(table.locator("tbody").locator("tr")).toHaveCount(2, { timeout: 30000 });
});
