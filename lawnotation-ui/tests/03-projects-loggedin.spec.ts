import { test, expect } from "@playwright/test";
import path from "node:path";

test("editor creates project, task, a new labelset and edits project and task", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const editorContext = await browser.newContext({
    storageState: "playwright/.auth/annotator.json",
  });
  const editorPage = await editorContext.newPage();
  await editorPage.goto("/");

  // Editor creates project
  await editorPage.getByTestId("projects-link").waitFor();
  await editorPage.getByTestId("projects-link").click();
  await editorPage.getByText("Don't show again", { exact: true }).waitFor();
  await editorPage.getByTestId("open-projects-modal").click();
  await editorPage.getByTestId("project-name").fill("Test project v2");
  await editorPage
    .getByTestId("project-description")
    .fill("This is the description");
  await editorPage.getByTestId("add-project").click();
  await editorPage.locator(".dimmer-wrapper > .dimmer").waitFor({ state: "hidden" }).catch(() => {});
  await editorPage.waitForLoadState("networkidle");
  const row = await editorPage
    .getByRole("table")
    .locator("tbody")
    .locator("tr")
    .first();
  await expect(row).toBeVisible({ timeout: 15000 });
  const viewButton = row.getByRole("button", { name: "View" });
  await expect(viewButton).toBeVisible({ timeout: 15000 });
  await viewButton.click();

  // Editor creates task
  await editorPage.getByTestId("tasks-tab").click();
  await editorPage.getByTestId("open-tasks-modal").click();
  const taskDialog = editorPage.getByRole("dialog", { name: "Create task" });
  await expect(taskDialog).toBeVisible();
  await taskDialog.getByRole("tab", { name: "New" }).click();
  await taskDialog.getByTestId("task-name").fill("Test");
  await taskDialog
    .getByTestId("task-description")
    .fill("This is a test description");
  await taskDialog.getByRole("button", { name: "text" }).click();
  await taskDialog.getByRole("button", { name: "symbol" }).click();

  // Editor creates labelset
  await taskDialog.getByTestId("create-new-labelset").click();
  await taskDialog.getByTestId("labelset-description").click();
  await taskDialog.getByTestId("labelset-name").fill("labelset test");
  await taskDialog.getByTestId("labelset-description").fill("test");
  await taskDialog.getByTestId("label-name").fill("First");
  await taskDialog.getByTestId("add-label").click();
  await taskDialog.getByTestId("label-name").fill("Second");
  await taskDialog.getByTestId("add-label").click();
  await taskDialog.getByTestId("label-name").fill("Third");
  await taskDialog.getByTestId("add-label").click();
  await taskDialog.getByTestId("save-labelset").click();
  await expect(editorPage.getByRole("alert").getByText(/created/i)).toBeVisible(
    { timeout: 10000 },
  );
  await editorPage.waitForTimeout(500);

  // Now select the labelset from dropdown
  await taskDialog.getByTestId("select-labelset").click();
  const labelsetOption = editorPage.getByRole("option", { name: "labelset test" });
  await expect(labelsetOption).toBeVisible({ timeout: 5000 });
  await labelsetOption.click();
  await expect(taskDialog.getByTestId("select-labelset")).toContainText(
    "labelset test",
  );

  const symbolGranularity = taskDialog.getByRole("button", { name: "symbol", exact: true });
  await symbolGranularity.click();
  await expect(symbolGranularity).toHaveAttribute("aria-pressed", "true");

  await taskDialog.getByTestId("create-tasks").click();
  await expect(taskDialog).toBeHidden({ timeout: 10000 });
  await editorPage.waitForLoadState("networkidle");
  const taskRow = await editorPage.getByRole("table").locator("tbody tr").first();
  await expect(taskRow).toBeVisible({ timeout: 15000 });

  // Editor edits a task
  const editRow = editorPage
    .getByRole("table")
    .locator("tbody")
    .locator("tr")
    .first();
  await expect(editRow).toBeVisible({ timeout: 15000 });
  const editsButton = editRow.getByLabel("Edit");
  await expect(editsButton).toBeVisible({ timeout: 15000 });
  await editsButton.click();
  await editorPage.getByTestId("task-name").fill("Task test");
  await editorPage.getByRole("combobox").click();
  await editorPage.getByRole("option", { name: "labelset test" }).click();
  await editorPage.getByTestId("save-changes-button").click();
  await editorPage.getByRole("dialog").waitFor({ state: "hidden" });
  await editorPage.getByTestId("projects-link").click();

  // Editor edits project
  const projectRow = editorPage
    .getByRole("table")
    .locator("tbody")
    .locator("tr")
    .first();
  const editedButton = projectRow.getByLabel("Edit");
  await expect(editedButton).toBeVisible();
  await editedButton.click();
  await editorPage.getByTestId("project-name").fill("Test project");
  await editorPage.getByTestId("save-changes-button").click();
  await editorPage.locator(".dimmer-wrapper > .dimmer").waitFor({ state: "hidden" }).catch(() => {});
  const firstRow = await editorPage.getByRole("table").locator("tbody tr").first();
  await expect(firstRow).toBeVisible({ timeout: 15000 });

  // Editor deletes project
  await editorPage.getByTestId("checkbox").first().check();
  await editorPage.getByTestId("remove-selected-rows").click();
  await editorPage.getByLabel("Yes, delete").click();
  await expect(
    editorPage.getByRole("alert").getByText("Items succesfully removed"),
  ).toBeVisible();
});
