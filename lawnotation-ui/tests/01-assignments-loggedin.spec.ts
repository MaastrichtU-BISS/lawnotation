import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

test.describe.configure({ mode: "serial" });

async function ensureLoggedIn(page: Page) {
  await page.goto("/");
  await page
    .getByTestId("assigned-tasks-menu-item")
    .waitFor({ state: "visible" });
}
test("Editor creates project, task, uploads document and assigns task", async ({
  browser,
}) => {
  test.setTimeout(240000);
  const annotatorContext = await browser.newContext({
    storageState: "playwright/.auth/annotator.json",
  });
  const annotatorPage = await annotatorContext.newPage();
  await ensureLoggedIn(annotatorPage);

  // Annotator assert if there are no assignments
  await annotatorPage.getByTestId("assigned-tasks-menu-item").waitFor();
  await annotatorPage.getByTestId("assigned-tasks-menu-item").click();
  await expect(annotatorPage.getByText("Showing 0 of 0")).toBeVisible();

  // Editor creates a project
  const editorContext = await browser.newContext({
    storageState: "playwright/.auth/editor.json",
  });
  const editorPage = await editorContext.newPage();
  await ensureLoggedIn(editorPage);
  await editorPage.getByTestId("projects-link").click();
  await editorPage.getByText("Don't show again", { exact: true }).waitFor();
  await editorPage.getByTestId("open-projects-modal").click();

  const projectName = `Test project2-${Date.now()}`;
  await editorPage.getByTestId("project-name").fill(projectName);
  await editorPage.getByTestId("add-project").click();
  await editorPage.getByRole("alert").waitFor({ state: "hidden" });

  const row = editorPage
    .getByRole("table")
    .first()
    .getByRole("row")
    .filter({ hasText: projectName })
    .first();

  const viewButton = row.getByRole("button", { name: "View" });
  await expect(viewButton).toBeVisible({ timeout: 15000 });
  await Promise.all([
    editorPage.waitForURL(/\/projects\/\d+/, { timeout: 15000 }),
    viewButton.click(),
  ]);

  // assert stable element on details page
  await expect(editorPage.getByTestId("open-documents-modal")).toBeVisible();

  // Editor uploads document
  await editorPage.getByTestId("documents-tab").click();
  await editorPage.getByTestId("open-documents-modal").click();
  const dialog = editorPage.getByRole("dialog", { name: /Add documents/ });
  await expect(dialog).toBeVisible({});
  const fileChooserPromise = editorPage.waitForEvent("filechooser");
  await dialog.getByText("Select", { exact: true }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, "input", "lorem-ipsum.txt"));
  const uploadedFile = editorPage.locator(".p-fileupload-file").first();
  await expect(uploadedFile).toContainText("lorem-ipsum.txt", {});
  await editorPage
    .locator(".p-toast")
    .waitFor({ state: "hidden" })
    .catch(() => {});
  const uploadButton = editorPage.getByRole("button", { name: "Upload" });
  await uploadButton.waitFor({ state: "visible" });
  await uploadButton.click();

  // Wait for upload to complete
  await editorPage
    .locator(".p-toast")
    .waitFor({ state: "hidden" })
    .catch(() => {});

  // Editor creates task
  await editorPage.getByTestId("open-tasks-modal").waitFor();
  await editorPage.getByTestId("open-tasks-modal").click();
  await editorPage.getByTestId("task-name").waitFor({ state: "visible" });
  await editorPage.getByTestId("task-name").fill("Test task");
  await editorPage.getByTestId("task-description").fill("Test discription");
  await editorPage.getByTestId("select-labelset").click();
  await editorPage.getByText("Seeded labelset").click();
  await editorPage.getByRole("button", { name: "Text" }).click();
  await editorPage.getByRole("button", { name: "Word" }).click();

  await editorPage.getByTestId("create-tasks").click();

  await expect(
    editorPage.getByRole("dialog", { name: /Create task/ })
  ).toBeHidden({ timeout: 15000 });

  const taskRow = editorPage
    .getByTestId("tasks-table")
    .getByRole("row")
    .filter({ hasText: "Test task" })
    .first();
  await expect(taskRow).toBeVisible({ timeout: 15000 });

  await taskRow.getByTestId("view-task-link").click();

  await expect(editorPage).toHaveURL(
    /\/projects\/\d+\/tasks\/\d+(?:\/)?(?:[?#].*)?$/,
    {
      timeout: 30000,
    }
  );

  // Editor assigns task
  await expect(editorPage.getByText("Add myself")).toBeVisible({ timeout: 15000 });
  await editorPage.getByText("Add myself").click();

  const inputEmail = editorPage
    .getByTestId("annotator-emails")
    .locator("input");
  await expect(inputEmail).toBeVisible();
  await inputEmail.fill("annotator@example.com");
  await inputEmail.press("Enter");
  await editorPage.getByTestId("create-assignments").click();
  await expect(
    editorPage.getByText("Assignments successfully created")
  ).toBeVisible();

  // Editor deletes project
  await editorPage.getByTestId("projects-link").click();
  await row.getByRole("checkbox").click();
  await editorPage.getByTestId("remove-selected-rows").click();
  await editorPage.getByLabel("Yes, delete").click();
  await editorPage
    .getByRole("alert")
    .getByText("Items succesfully removed")
    .waitFor();
});

test("Editor creates project, task, uploads documents , assigns task and deletes one document. Annotator should still be able to annotate all remaining assignments.", async ({
  browser,
}) => {
  test.setTimeout(340000);

  const annotatorContext = await browser.newContext({
    storageState: "playwright/.auth/annotator.json",
  });
  const annotatorPage = await annotatorContext.newPage();
  await ensureLoggedIn(annotatorPage);

  // Annotator assert if there are no assignments
  await annotatorPage.getByTestId("assigned-tasks-menu-item").waitFor();
  await annotatorPage.getByTestId("assigned-tasks-menu-item").click();
  await expect(annotatorPage.getByText("Showing 0 of 0")).toBeVisible();

  // Editor context
  const editorContext = await browser.newContext({
    storageState: "playwright/.auth/editor.json",
  });
  const editorPage = await editorContext.newPage();
  await ensureLoggedIn(editorPage);

  // Editor creates project
  await editorPage.getByTestId("projects-link").click();
  await expect(editorPage).toHaveURL(/\/projects(?:\/)?$/);
  await editorPage.getByText("Don't show again", { exact: true }).waitFor();
  await editorPage.getByTestId("open-projects-modal").click();

  const projectName = `Test project2-${Date.now()}`;
  await editorPage.getByTestId("project-name").fill(projectName);
  await editorPage.getByTestId("add-project").click();
  await editorPage.getByRole("alert").waitFor({ state: "hidden" });

  // Scope to the projects table and wait for the created row to appear.
  const row = editorPage
    .getByRole("table")
    .first()
    .getByRole("row")
    .filter({ hasText: projectName })
    .first();

  const viewButton = row.getByRole("button", { name: "View" });
  await expect(viewButton).toBeVisible({ timeout: 15000 });

  await Promise.all([
    editorPage.waitForURL(/\/projects\/\d+/, { timeout: 15000 }),
    viewButton.click(),
  ]);

  // assert stable element on details page
  await expect(editorPage.getByTestId("open-documents-modal")).toBeVisible();

  // Editor uploads documents
  await editorPage.getByTestId("documents-tab").click();
  await editorPage.getByTestId("open-documents-modal").click();

  await editorPage.getByRole("dialog", { name: /Add documents/ }).waitFor({
    state: "visible",
  });

  // Upload 1
  const fc1 = editorPage.waitForEvent("filechooser");
  await editorPage.getByText("Select", { exact: true }).click();
  await (await fc1).setFiles(path.join(__dirname, "input", "lorem-ipsum.txt"));

  // Upload 2
  const fc2 = editorPage.waitForEvent("filechooser");
  await editorPage.getByText("Select", { exact: true }).click();
  await (await fc2).setFiles(path.join(__dirname, "input", "casablanca.txt"));

  // Upload 3
  const fc3 = editorPage.waitForEvent("filechooser");
  await editorPage.getByText("Select", { exact: true }).click();
  await (
    await fc3
  ).setFiles(path.join(__dirname, "input", "the-godfather.txt"));

  // Upload 4
  const fc4 = editorPage.waitForEvent("filechooser");
  await editorPage.getByText("Select", { exact: true }).click();
  await (
    await fc4
  ).setFiles(path.join(__dirname, "input", "the-wizard-of-oz.txt"));

  const uploadButton = editorPage.getByRole("button", { name: "Upload" });
  await expect(uploadButton).toBeVisible();
  await uploadButton.click();
  await editorPage
    .locator(".p-toast")
    .waitFor({ state: "hidden" })
    .catch(() => {});
  await editorPage.keyboard.press("Escape");
  await editorPage
    .locator(".p-dialog-mask")
    .waitFor({ state: "hidden" })
    .catch(() => {});
  await editorPage.waitForLoadState("networkidle");
  await editorPage
    .locator(".p-toast")
    .waitFor({ state: "hidden", timeout: 3000 })
    .catch(() => {});
  await editorPage
    .locator(".dimmer-wrapper > .dimmer")
    .waitFor({ state: "hidden" });
  await editorPage.waitForTimeout(500);
  const documentsTab = editorPage.getByRole("tab", { name: "Documents" });
  await documentsTab.click({ force: true });
  await editorPage.getByRole("table").waitFor({ state: "visible" });
  await expect(documentsTab).toHaveAttribute("aria-selected", "true");
  await editorPage.waitForTimeout(300);
  await editorPage
    .getByTestId("checkbox")
    .first()
    .waitFor({ state: "visible" });

  // Editor deletes a document
  await editorPage.waitForLoadState("networkidle");
  await editorPage
    .locator(".dimmer-wrapper > .dimmer")
    .waitFor({ state: "hidden" });
  const checkbox = editorPage.getByTestId("checkbox").first();
  await checkbox.click();
  await editorPage
    .getByRole("button", { name: "Delete selected row (1)" })
    .click();
  await editorPage.getByLabel("Yes, delete").click();
  await editorPage
    .getByRole("alert")
    .getByText("Items succesfully removed")
    .waitFor();

  // Editor creates task
  await editorPage.getByTestId("open-tasks-modal").waitFor();
  await editorPage.getByTestId("open-tasks-modal").click();
  await editorPage.getByTestId("task-name").waitFor({ state: "visible" });
  await editorPage.getByTestId("task-name").fill("Test task");
  await editorPage.getByTestId("task-description").fill("Test discription");
  await editorPage.getByTestId("select-labelset").click();
  await editorPage.getByText("Seeded labelset").click();
  await editorPage.getByRole("button", { name: "Text" }).click();
  await editorPage.getByRole("button", { name: "Word" }).click();

  await editorPage.getByTestId("create-tasks").click();

  await expect(
    editorPage.getByRole("dialog", { name: /Create task/ })
  ).toBeHidden({ timeout: 15000 });

  const taskRow = editorPage
    .getByTestId("tasks-table")
    .getByRole("row")
    .filter({ hasText: "Test task" })
    .first();
  await expect(taskRow).toBeVisible({ timeout: 15000 });

  await taskRow.getByTestId("view-task-link").click();

  await expect(editorPage).toHaveURL(
    /\/projects\/\d+\/tasks\/\d+(?:\/)?(?:[?#].*)?$/,
    {
      timeout: 30000,
    }
  );

  // Editor assigns task
  await expect(editorPage.getByText("Add myself")).toBeVisible({ timeout: 15000 });
  await editorPage.getByText("Add myself").click();

  const inputEmail = editorPage
    .getByTestId("annotator-emails")
    .locator("input");
  await expect(inputEmail).toBeVisible();
  await inputEmail.fill("annotator@example.com");
  await inputEmail.press("Enter");
  await editorPage.getByTestId("create-assignments").click();
  await expect(
    editorPage.getByText("Assignments successfully created")
  ).toBeVisible();

  // Annotator verifies assignment
  await annotatorPage.reload();
  await annotatorPage.getByTestId("assigned-tasks-menu-item").click();

  await expect(annotatorPage.getByText("Showing 1 - 1 of 1")).toBeVisible();

  await annotatorPage.getByTestId("view-task-link").click();

  // Annotator annotates text
  await annotatorPage.getByTestId("annotate-next-assignment-button").click();

  const annotateSentence = annotatorPage
    .locator(".lsf-richtext__container.lsf-htx-richtext")
    .first();

  await annotateSentence.click({ position: { x: 0, y: 0 } });

  await annotatorPage.mouse.down();

  const box = await annotateSentence.boundingBox();

  if (box) {
    await annotatorPage.mouse.move(box.x + box.width, box.y + 5, {
      steps: 10,
    });

    await annotatorPage.mouse.up();
  }

  // Editor deletes project
  await editorPage.getByTestId("projects-link").click();

  await row.getByRole("checkbox").click();

  await editorPage.getByTestId("remove-selected-rows").click();

  await editorPage.getByLabel("Yes, delete").click();

  await editorPage
    .getByRole("alert")
    .getByText("Items succesfully removed")
    .waitFor();
});
