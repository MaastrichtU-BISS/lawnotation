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
  const row = await editorPage
    .getByRole("table")
    .locator("tbody")
    .locator("tr")
    .first()
    .waitFor();
  const viewButton = editorPage
    .getByRole("table")
    .locator("tbody")
    .locator("tr")
    .first()
    .getByRole("button", { name: "View" });
  await viewButton.click();

  // Editor creates task
  await editorPage.getByTestId("tasks-tab").click();
  await editorPage.getByTestId("open-tasks-modal").click();
  await editorPage.getByTestId("task-name").fill("Test");
  await editorPage
    .getByTestId("task-description")
    .fill("This is a test description");
  await editorPage.getByRole("button", { name: "text" }).click();
  await editorPage.getByRole("button", { name: "symbol" }).click();

  // Editor creates labelset
  await editorPage.getByTestId("create-new-labelset").click();
  await editorPage.getByTestId("labelset-description").click();
  await editorPage.getByTestId("labelset-name").fill("labelset test");
  await editorPage.getByTestId("labelset-description").fill("test");
  await editorPage.getByTestId("label-name").fill("First");
  await editorPage.getByTestId("add-label").click();
  await editorPage.getByTestId("label-name").fill("Second");
  await editorPage.getByTestId("add-label").click();
  await editorPage.getByTestId("label-name").fill("Third");
  await editorPage.getByTestId("add-label").click();
  await editorPage.getByTestId("save-labelset").click();

  // Wait for labelset to be saved and refreshed in dropdown
  await expect(editorPage.getByRole("alert").getByText(/created/i)).toBeVisible(
    { timeout: 10000 },
  );

  // Wait a moment for the dropdown to be updated with the new labelset
  await editorPage.waitForTimeout(500);

  // Now select the labelset from dropdown
  await editorPage.getByTestId("select-labelset").click();
  await editorPage
    .getByRole("option", { name: "labelset test" })
    .waitFor({ state: "visible", timeout: 5000 });
  await editorPage.getByRole("option", { name: "labelset test" }).click();

  // Wait for dropdown to close and selection to be applied
  await editorPage.waitForTimeout(1000);

  // Verify the labelset is selected by checking the dropdown now shows it
  await expect(editorPage.getByTestId("select-labelset")).toContainText(
    "labelset test",
  );

  await editorPage.getByTestId("create-tasks").click();

  // Wait for task to be created and appear in the table
  await editorPage.getByRole("table").locator("tbody tr").first().waitFor();

  // Editor edits a task
  const editRow = editorPage
    .getByRole("table")
    .locator("tbody")
    .locator("tr")
    .first();
  const editsButton = editRow.getByLabel("Edit");
  await expect(editsButton).toBeVisible();
  await editsButton.click();
  await editorPage.getByTestId("task-name").fill("Task test");

  // Re-select the labelset in edit form to ensure it's properly set
  await editorPage.getByRole("combobox").click();
  await editorPage.getByRole("option", { name: "labelset test" }).click();

  await editorPage.getByTestId("save-changes-button").click();
  // Wait for dialog to close - the meaningful state change that indicates save completed
  await editorPage.getByRole("dialog").waitFor({ state: "hidden" });

  // Navigate back to project page to verify task edit was successful
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
  await editorPage.getByRole("table").locator("tbody tr").first().waitFor();

  // Editor deletes project
  await editorPage.getByTestId("checkbox").first().check();
  await editorPage.getByTestId("remove-selected-rows").click();
  await editorPage.getByLabel("Yes, delete").click();
  await expect(
    editorPage.getByRole("alert").getByText("Items succesfully removed"),
  ).toBeVisible();
});
