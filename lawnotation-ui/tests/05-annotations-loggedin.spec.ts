import { test, expect } from "@playwright/test";
import path from "node:path";

test("Annotator creates a project and annotates a word", async ({ browser }) => {
  test.setTimeout(240000);

  const context = await browser.newContext({
    storageState: path.join(__dirname, "..", "playwright", ".auth", "annotator.json"),
  });
  const page = await context.newPage();
  await page.goto("/", { waitUntil: "commit", timeout: 30000 });
  await page.getByTestId("projects-link").waitFor({
    state: "visible",
    timeout: 15000,
  });

  await page.getByTestId("projects-link").click();
  await page.getByText("Don't show again", { exact: true }).waitFor();
  await page.getByTestId("open-projects-modal").click();

  const projectName = `Annotation test project-${Date.now()}`;
  await page.getByTestId("project-name").fill(projectName);
  await page
    .getByTestId("project-description")
    .fill("Project for the logged-in annotation test");
  await page.getByTestId("add-project").click();

  const projectsTable = page.getByRole("table").first();
  const projectRow = projectsTable
    .getByRole("row")
    .filter({ hasText: projectName })
    .first();
  await expect(projectRow).toBeVisible({ timeout: 30000 });
  await projectRow.getByTestId("view-project-link").click();
  await page.waitForURL(/\/projects\/\d+\/?$/, { timeout: 30000 });

  await page.getByTestId("documents-tab").click();
  await page.getByTestId("open-documents-modal").click();
  const uploadDialog = page.getByRole("dialog", { name: /Add documents/ });
  await expect(uploadDialog).toBeVisible();

  const fileChooserPromise = page.waitForEvent("filechooser");
  await uploadDialog.getByRole("button", { name: "Choose files" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles([
    path.join(__dirname, "input", "lorem-ipsum.txt"),
    path.join(__dirname, "input", "casablanca.txt"),
    path.join(__dirname, "input", "the-godfather.txt"),
    path.join(__dirname, "input", "the-wizard-of-oz.txt"),
  ]);
  await expect(uploadDialog.getByText("4 documents ready")).toBeVisible();
  await uploadDialog.getByRole("button", { name: "Upload documents" }).click();
  await expect(page.getByText(/document\(s\) uploaded/)).toBeVisible({
    timeout: 60000,
  });

  await page.getByTestId("tasks-tab").click();
  await page.getByTestId("open-tasks-modal").click();
  const taskDialog = page.getByRole("dialog", { name: "Create task" });
  await expect(taskDialog).toBeVisible();

  const taskName = `Annotation test task-${Date.now()}`;
  await taskDialog.getByTestId("task-name").fill(taskName);
  await taskDialog
    .getByTestId("task-description")
    .fill("Task for testing word-level text annotation");

  const labelsetName = `Annotation test labels-${Date.now()}`;
  const labelName = "Test annotation label";
  await taskDialog.getByTestId("create-new-labelset").click();
  await taskDialog.getByTestId("labelset-name").fill(labelsetName);
  await taskDialog
    .getByTestId("labelset-description")
    .fill("Labelset for the annotation test");
  await taskDialog.getByTestId("label-name").fill(labelName);
  await taskDialog.getByTestId("add-label").click();
  await taskDialog.getByTestId("save-labelset").click();
  await expect(page.getByRole("alert").getByText(/created/i)).toBeVisible({
    timeout: 10000,
  });

  await taskDialog.getByTestId("select-labelset").click();
  await page.getByRole("option", { name: labelsetName }).click();
  await expect(taskDialog.getByTestId("select-labelset")).toContainText(
    labelsetName,
  );

  const textLevel = taskDialog.getByRole("button", {
    name: /^text$/i,
    exact: true,
  });
  await textLevel.click();
  await expect(textLevel).toHaveAttribute("aria-pressed", "true");

  const wordGranularity = taskDialog.getByRole("button", {
    name: /^word$/i,
    exact: true,
  });
  await wordGranularity.click();
  await expect(wordGranularity).toHaveAttribute("aria-pressed", "true");

  await taskDialog.getByTestId("create-tasks").click();
  await expect(taskDialog).toBeHidden({ timeout: 15000 });

  const taskRow = page
    .getByTestId("tasks-table")
    .getByRole("row")
    .filter({ hasText: taskName })
    .first();
  await expect(taskRow).toBeVisible({ timeout: 30000 });
  await taskRow.getByTestId("view-task-link").click();
  await page.waitForURL(/\/projects\/\d+\/tasks\/\d+/, {
    timeout: 30000,
  });

  await expect(page.getByText("Add myself")).toBeVisible({ timeout: 15000 });
  await page.getByText("Add myself").click();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("assignment.createMany") &&
        response.status() === 200,
    ),
    page.getByTestId("create-assignments").click(),
  ]);

  await page.getByTestId("assigned-tasks-menu-item").click();
  const assignedTaskRow = page
    .getByRole("row")
    .filter({ hasText: taskName })
    .first();
  await expect(assignedTaskRow).toBeVisible({ timeout: 30000 });
  await assignedTaskRow.getByTestId("view-task-link").click();
  await page.waitForURL(/\/tasks\/\d+\/?$/, { timeout: 30000 });

  await page.getByTestId("annotate-next-assignment-button").click();
  const documentText = page.locator(".lak-annotator .document__text").first();
  await expect(documentText).toBeVisible({ timeout: 30000 });
  const targetWord = (await documentText.textContent())?.match(/[A-Za-z0-9]+/)?.[0];
  if (!targetWord) {
    throw new Error("The assigned document does not contain selectable text");
  }

  const labelOption = page.getByText(labelName, { exact: true });
  await expect(labelOption).toBeVisible();
  await labelOption.click();

  const wordPosition = await documentText.evaluate((element, word) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const offset = node.textContent?.indexOf(word) ?? -1;
      if (offset < 0) continue;

      const range = document.createRange();
      range.setStart(node, offset);
      range.setEnd(node, offset + word.length);
      const bounds = range.getBoundingClientRect();
      return {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      };
    }
    return null;
  }, targetWord);
  if (!wordPosition) {
    throw new Error(`Could not find "${targetWord}" in the document text`);
  }
  await page.mouse.dblclick(wordPosition.x, wordPosition.y);

  await expect(
    documentText.locator("mark").filter({ hasText: targetWord }),
  ).toBeVisible();
  const annotationRow = page
    .locator(".lak-annotator")
    .getByRole("listitem")
    .filter({ hasText: labelName })
    .filter({ hasText: targetWord });
  await expect(annotationRow).toBeVisible();

  await context.close();
});
