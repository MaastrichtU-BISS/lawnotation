import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

async function ensureLoggedIn(
  page: Page,
  expectedUser: "editor" | "annotator",
) {
  await page.goto("/", { waitUntil: "networkidle" });

  await page
    .getByTestId("assigned-tasks-menu-item")
    .waitFor({ state: "visible", timeout: 30_000 });

  await expect(page.getByRole("button", { name: expectedUser })).toBeVisible({
    timeout: 30_000,
  });
}

test("Editor creates project, task, uploads document and assigns task", async ({
  browser,
}) => {
  test.setTimeout(240_000);

  const annotatorContext = await browser.newContext({
    storageState: "playwright/.auth/annotator.json",
  });

  const annotatorPage = await annotatorContext.newPage();

  await ensureLoggedIn(annotatorPage, "annotator");

  // Annotator assert if there are no assignments
  await annotatorPage.getByTestId("assigned-tasks-menu-item").click();

  await expect(annotatorPage.getByText("Showing 0 of 0")).toBeVisible({
    timeout: 15_000,
  });

  // Editor creates a project
  const editorContext = await browser.newContext({
    storageState: "playwright/.auth/editor.json",
  });

  const editorPage = await editorContext.newPage();

  await ensureLoggedIn(editorPage, "editor");

  await editorPage.getByTestId("projects-link").click();

  await expect(editorPage).toHaveURL(/\/projects(?:\/)?(?:[?#].*)?$/, {
    timeout: 30_000,
  });

  await editorPage.getByText("Don't show again", { exact: true }).waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await editorPage.getByTestId("open-projects-modal").click();

  const projectName = `Test project2-${Date.now()}`;

  await editorPage.getByTestId("project-name").fill(projectName);
  await editorPage.getByTestId("add-project").click();

  await editorPage
    .getByRole("alert")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  await editorPage
    .locator(".dimmer-wrapper > .dimmer")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  // Wait for table to be visible and overlays to be gone
  const projectsTable = editorPage.getByRole("table").first();

  await projectsTable.waitFor({ state: "visible", timeout: 30_000 });

  const projectRow = projectsTable
    .getByRole("row")
    .filter({ hasText: projectName })
    .first();

  await expect(projectRow).toBeVisible({ timeout: 30_000 });
  await expect(projectRow.getByText(projectName)).toBeVisible({
    timeout: 30_000,
  });

  const viewProjectLink = projectRow.getByTestId("view-project-link");

  await expect(viewProjectLink).toHaveAttribute("href", /\/projects\/\d+/);

  await Promise.all([
    editorPage.waitForURL(/\/projects\/\d+(?:\/)?(?:[?#].*)?$/, {
      timeout: 30_000,
    }),
    viewProjectLink.click(),
  ]);

  // Assert stable element on details page instead of checking URL twice
  await expect(editorPage.getByTestId("open-documents-modal")).toBeVisible({
    timeout: 30_000,
  });

  // Editor uploads document
  await editorPage.getByTestId("documents-tab").click();
  await editorPage.getByTestId("open-documents-modal").click();

  const documentDialog = editorPage.getByRole("dialog", {
    name: /Add documents/i,
  });

  await expect(documentDialog).toBeVisible({ timeout: 30_000 });

  const fileChooserPromise = editorPage.waitForEvent("filechooser");

  await documentDialog.getByText("Select", { exact: true }).click();

  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, "input", "lorem-ipsum.txt"));

  const uploadedFile = editorPage.locator(".p-fileupload-file").first();

  await expect(uploadedFile).toContainText("lorem-ipsum.txt", {
    timeout: 30_000,
  });

  await editorPage
    .locator(".p-toast")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  const uploadButton = editorPage.getByRole("button", { name: "Upload" });

  await expect(uploadButton).toBeVisible({ timeout: 30_000 });
  await uploadButton.click();

  await editorPage
    .locator(".p-toast")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  await editorPage
    .locator(".p-dialog-mask")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  // Editor creates task
  await editorPage.getByTestId("open-tasks-modal").waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await editorPage.getByTestId("open-tasks-modal").click();

  await editorPage.getByTestId("task-name").waitFor({
    state: "visible",
    timeout: 30_000,
  });

  const taskName = `Test task-${Date.now()}`;

  await editorPage.getByTestId("task-name").fill(taskName);
  await editorPage.getByTestId("task-description").fill("Test description");
  await editorPage.getByTestId("select-labelset").click();
  await editorPage.getByText("Seeded labelset").click();
  await editorPage.getByRole("button", { name: "Text" }).click();
  await editorPage.getByRole("button", { name: "Word" }).click();

  await editorPage.getByTestId("create-tasks").click();

  await expect(
    editorPage.getByRole("dialog", { name: /Create task/i }),
  ).toBeHidden({ timeout: 30_000 });

  const taskRow = editorPage
    .getByTestId("tasks-table")
    .getByRole("row")
    .filter({ hasText: taskName })
    .first();

  await expect(taskRow).toBeVisible({ timeout: 30_000 });

  const viewTaskLink = taskRow.getByTestId("view-task-link");

  await expect(viewTaskLink).toHaveAttribute(
    "href",
    /\/projects\/\d+\/tasks\/\d+/,
  );

  await Promise.all([
    editorPage.waitForURL(/\/projects\/\d+\/tasks\/\d+(?:\/)?(?:[?#].*)?$/, {
      timeout: 30_000,
    }),
    viewTaskLink.click(),
  ]);

  await expect(editorPage.getByTestId("create-assignments")).toBeVisible({
    timeout: 30_000,
  });

  // Editor assigns task
  await expect(editorPage.getByText("Add myself")).toBeVisible({
    timeout: 30_000,
  });

  const inputEmail = editorPage.getByTestId("annotator-emails");

  await inputEmail.waitFor({ state: "visible", timeout: 30_000 });
  await inputEmail.fill("annotator@example.com");
  await inputEmail.press("Enter");

  await editorPage.getByText("Add myself").click();

  await Promise.all([
    editorPage.waitForResponse(
      (response) =>
        response.url().includes("/api/") && response.status() === 200,
      { timeout: 30_000 },
    ),
    editorPage.getByTestId("create-assignments").click(),
  ]);

  // Editor deletes project
  await editorPage.getByTestId("projects-link").click();

  await expect(editorPage).toHaveURL(/\/projects(?:\/)?(?:[?#].*)?$/, {
    timeout: 30_000,
  });

  const projectsTableAfterReturn = editorPage.getByRole("table").first();

  await expect(projectsTableAfterReturn).toBeVisible({ timeout: 30_000 });

  const projectRowAfterReturn = projectsTableAfterReturn
    .getByRole("row")
    .filter({ hasText: projectName })
    .first();

  await expect(projectRowAfterReturn).toBeVisible({ timeout: 30_000 });

  await projectRowAfterReturn.getByRole("checkbox").click();

  await editorPage.getByTestId("remove-selected-rows").click();
  await editorPage.getByLabel("Yes, delete").click();

  await editorPage
    .getByRole("alert")
    .getByText("Items succesfully removed")
    .waitFor({ timeout: 30_000 });

  await annotatorContext.close();
  await editorContext.close();
});

test("Editor creates project, task, uploads documents , assigns task and deletes one document. Annotator should still be able to annotate all remaining assignments.", async ({
  browser,
}) => {
  test.setTimeout(340_000);

  const annotatorContext = await browser.newContext({
    storageState: "playwright/.auth/annotator.json",
  });

  const annotatorPage = await annotatorContext.newPage();

  await ensureLoggedIn(annotatorPage, "annotator");

  // Annotator assert if there are no assignments
  await annotatorPage.getByTestId("assigned-tasks-menu-item").click();

  await expect(annotatorPage.getByText("Showing 0 of 0")).toBeVisible({
    timeout: 15_000,
  });

  // Editor context
  const editorContext = await browser.newContext({
    storageState: "playwright/.auth/editor.json",
  });

  const editorPage = await editorContext.newPage();

  await ensureLoggedIn(editorPage, "editor");

  // Editor creates project
  await editorPage.getByTestId("projects-link").click();

  await expect(editorPage).toHaveURL(/\/projects(?:\/)?(?:[?#].*)?$/, {
    timeout: 30_000,
  });

  await editorPage.getByText("Don't show again", { exact: true }).waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await editorPage.getByTestId("open-projects-modal").click();

  const projectName = `Test project2-${Date.now()}`;

  await editorPage.getByTestId("project-name").fill(projectName);
  await editorPage.getByTestId("add-project").click();

  await editorPage
    .getByRole("alert")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  await editorPage
    .locator(".dimmer-wrapper > .dimmer")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  const projectsTable = editorPage.getByRole("table").first();

  await projectsTable.waitFor({ state: "visible", timeout: 30_000 });

  const projectRow = projectsTable
    .getByRole("row")
    .filter({ hasText: projectName })
    .first();

  await expect(projectRow).toBeVisible({ timeout: 30_000 });

  const viewProjectLink = projectRow.getByTestId("view-project-link");

  await expect(viewProjectLink).toHaveAttribute("href", /\/projects\/\d+/);

  await Promise.all([
    editorPage.waitForURL(/\/projects\/\d+(?:\/)?(?:[?#].*)?$/, {
      timeout: 30_000,
    }),
    viewProjectLink.click(),
  ]);

  const projectUrl = editorPage.url();

  await expect(editorPage.getByRole("button", { name: "editor" })).toBeVisible({
    timeout: 30_000,
  });

  await expect(editorPage.getByTestId("documents-tab")).toBeVisible({
    timeout: 30_000,
  });

  await expect(editorPage.getByTestId("open-documents-modal")).toBeVisible({
    timeout: 30_000,
  });

  // Editor uploads documents
  await editorPage.getByTestId("documents-tab").click();

  await expect(editorPage.getByTestId("documents-tab")).toHaveAttribute(
    "aria-selected",
    "true",
    { timeout: 30_000 },
  );

  await editorPage.getByTestId("open-documents-modal").click();

  await editorPage.getByRole("dialog", { name: /Add documents/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });

  const addDocumentsDialog = editorPage.getByRole("dialog", {
    name: /Add documents/i,
  });

  const fc1 = editorPage.waitForEvent("filechooser");
  await addDocumentsDialog.getByText("Select", { exact: true }).click();
  await (await fc1).setFiles(path.join(__dirname, "input", "lorem-ipsum.txt"));

  const fc2 = editorPage.waitForEvent("filechooser");
  await addDocumentsDialog.getByText("Select", { exact: true }).click();
  await (await fc2).setFiles(path.join(__dirname, "input", "casablanca.txt"));

  const fc3 = editorPage.waitForEvent("filechooser");
  await addDocumentsDialog.getByText("Select", { exact: true }).click();
  await (
    await fc3
  ).setFiles(path.join(__dirname, "input", "the-godfather.txt"));

  const fc4 = editorPage.waitForEvent("filechooser");
  await addDocumentsDialog.getByText("Select", { exact: true }).click();
  await (
    await fc4
  ).setFiles(path.join(__dirname, "input", "the-wizard-of-oz.txt"));

  const uploadButton = editorPage.getByRole("button", { name: "Upload" });

  await expect(uploadButton).toBeVisible({ timeout: 30_000 });
  await expect(uploadButton).toBeEnabled({ timeout: 30_000 });

  const uploadResponsePromise = editorPage.waitForResponse(
    (response) => {
      const url = response.url();

      return (
        url.includes("/api/") &&
        response.request().method() !== "GET" &&
        response.status() >= 200 &&
        response.status() < 300
      );
    },
    { timeout: 60_000 },
  );

  await uploadButton.click();

  const uploadResponse = await uploadResponsePromise;

  expect(uploadResponse.ok()).toBeTruthy();

  await editorPage
    .locator(".p-toast")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  await editorPage
    .locator(".p-dialog-mask")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  await editorPage
    .locator(".dimmer-wrapper > .dimmer")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  // Upload can return the page to the default/tasks state.
  // Go back to the project detail page and open Documents again before asserting rows.
  await editorPage.goto(projectUrl, {
    waitUntil: "networkidle",
  });

  await expect(editorPage.getByRole("button", { name: "editor" })).toBeVisible({
    timeout: 30_000,
  });

  const documentsTab = editorPage.getByTestId("documents-tab");

  await expect(documentsTab).toBeVisible({ timeout: 30_000 });
  await documentsTab.click();

  await expect(documentsTab).toHaveAttribute("aria-selected", "true", {
    timeout: 30_000,
  });

  await expect(editorPage.getByText("lorem-ipsum.txt")).toBeVisible({
    timeout: 30_000,
  });

  const documentsTable = editorPage.getByRole("table").first();

  await expect(documentsTable).toBeVisible({ timeout: 30_000 });

  const uploadedDocumentRow = documentsTable
    .getByRole("row")
    .filter({ hasText: "lorem-ipsum.txt" })
    .first();

  await expect(uploadedDocumentRow).toBeVisible({ timeout: 30_000 });

  const documentCheckbox = uploadedDocumentRow
    .locator('input[data-test="checkbox"]')
    .first();

  await expect(documentCheckbox).toBeVisible({ timeout: 30_000 });

  // Editor deletes a document
  await editorPage
    .locator(".dimmer-wrapper > .dimmer")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  await documentCheckbox.setChecked(true);

  await editorPage
    .getByRole("button", { name: "Delete selected row (1)" })
    .click();

  await editorPage.getByLabel("Yes, delete").click();

  await editorPage
    .getByRole("alert")
    .getByText("Items succesfully removed")
    .waitFor({ timeout: 30_000 });

  // Editor creates task
  await editorPage.getByTestId("open-tasks-modal").waitFor({
    state: "visible",
    timeout: 30_000,
  });

  await editorPage.getByTestId("open-tasks-modal").click();

  await editorPage.getByTestId("task-name").waitFor({
    state: "visible",
    timeout: 30_000,
  });

  const taskName = `Test task-${Date.now()}`;

  await editorPage.getByTestId("task-name").fill(taskName);
  await editorPage.getByTestId("task-description").fill("Test description");
  await editorPage.getByTestId("select-labelset").click();
  await editorPage.getByText("Seeded labelset").click();
  await editorPage.getByRole("button", { name: "Text" }).click();
  await editorPage.getByRole("button", { name: "Word" }).click();
  await editorPage.getByTestId("create-tasks").click();

  await expect(
    editorPage.getByRole("dialog", { name: /Create task/i }),
  ).toBeHidden({ timeout: 30_000 });

  const taskRow = editorPage
    .getByTestId("tasks-table")
    .getByRole("row")
    .filter({ hasText: taskName })
    .first();

  await expect(taskRow).toBeVisible({ timeout: 30_000 });

  const viewTaskLink = taskRow.getByTestId("view-task-link");

  await expect(viewTaskLink).toHaveAttribute(
    "href",
    /\/projects\/\d+\/tasks\/\d+/,
  );

  await Promise.all([
    editorPage.waitForURL(/\/projects\/\d+\/tasks\/\d+(?:\/)?(?:[?#].*)?$/, {
      timeout: 30_000,
    }),
    viewTaskLink.click(),
  ]);

  await expect(editorPage.getByTestId("create-assignments")).toBeVisible({
    timeout: 30_000,
  });

  // Editor assigns task
  await expect(editorPage.getByText("Add myself")).toBeVisible({
    timeout: 30_000,
  });

  const inputEmail = editorPage.getByTestId("annotator-emails");

  await inputEmail.waitFor({ state: "visible", timeout: 30_000 });
  await inputEmail.fill("annotator@example.com");
  await inputEmail.press("Enter");

  await editorPage.getByText("Add myself").click();

  await Promise.all([
    editorPage.waitForResponse(
      (response) =>
        response.url().includes("/api/") && response.status() === 200,
      { timeout: 30_000 },
    ),
    editorPage.getByTestId("create-assignments").click(),
  ]);

  // Annotator verifies assignment
  await annotatorPage.reload({ waitUntil: "networkidle" });
  await annotatorPage.getByTestId("assigned-tasks-menu-item").click();

  await expect(annotatorPage.getByText("Showing 1 - 1 of 1")).toBeVisible({
    timeout: 30_000,
  });

  await Promise.all([
    annotatorPage.waitForURL(/\/tasks\/\d+(?:\/)?(?:[?#].*)?$/, {
      timeout: 30_000,
    }),
    annotatorPage.getByTestId("view-task-link").click(),
  ]);

  const annotateNextLink = annotatorPage.getByRole("link", {
    name: /Annotate Next Assignment/i,
  });

  await expect(annotateNextLink).toBeVisible({ timeout: 30_000 });

  await annotateNextLink.click();

  await annotatorPage.waitForURL(
    (url) =>
      url.pathname.startsWith("/annotate/") &&
      url.searchParams.get("seq") !== null,
    { timeout: 30_000 },
  );

  const annotateSentence = annotatorPage
    .locator(".lsf-richtext__container.lsf-htx-richtext")
    .first();

  await expect(annotateSentence).toBeVisible({ timeout: 30_000 });

  await annotateSentence.click({ position: { x: 5, y: 5 } });

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

  await expect(editorPage).toHaveURL(/\/projects(?:\/)?(?:[?#].*)?$/, {
    timeout: 30_000,
  });

  const projectsTableAfterReturn = editorPage.getByRole("table").first();

  await expect(projectsTableAfterReturn).toBeVisible({ timeout: 30_000 });

  const projectRowAfterReturn = projectsTableAfterReturn
    .getByRole("row")
    .filter({ hasText: projectName })
    .first();

  await expect(projectRowAfterReturn).toBeVisible({ timeout: 30_000 });

  await projectRowAfterReturn.getByRole("checkbox").click();

  await editorPage.getByTestId("remove-selected-rows").click();
  await editorPage.getByLabel("Yes, delete").click();

  await editorPage
    .getByRole("alert")
    .getByText("Items succesfully removed")
    .waitFor({ timeout: 30_000 });

  await annotatorContext.close();
  await editorContext.close();
});
