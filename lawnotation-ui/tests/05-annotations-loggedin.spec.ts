import { test, expect } from "@playwright/test";
import path from "node:path";

test("Annotator creates a project and annotates a word", async ({ browser }) => {
  test.setTimeout(240000);

  const context = await browser.newContext({
    storageState: path.join(__dirname, "..", "playwright", ".auth", "annotator.json"),
  });
  const page = await context.newPage();
  try {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await expect(page.getByTestId("projects-link")).toBeVisible({
      timeout: 15000,
    });

    await Promise.all([
      page.waitForURL(/\/projects\/?$/, { timeout: 30000 }),
      page.getByTestId("projects-link").click(),
    ]);
    await page.waitForLoadState("domcontentloaded");
    const hideGuidance = page.getByRole("button", {
      name: "Don't show again",
      exact: true,
    });
    await expect(hideGuidance).toBeVisible({ timeout: 15000 });
    await hideGuidance.click();
    await expect(hideGuidance).toBeHidden({ timeout: 15000 });
    const openProjectsModal = page.locator(
      'button[data-test="open-projects-modal"]',
    );
    await expect(openProjectsModal).toBeVisible({
      timeout: 15000,
    });
    await expect(openProjectsModal).toBeEnabled({ timeout: 15000 });
    await openProjectsModal.click();
    const projectForm = page.locator('form[data-test="create-project-form"]');
    await expect(projectForm).toBeAttached({ timeout: 15000 });
    await expect(projectForm).toBeVisible({ timeout: 15000 });
    const projectNameInput = projectForm.locator(
      'input[data-test="project-name"]',
    );
    await expect(projectNameInput).toBeVisible({ timeout: 15000 });

    const projectName = `Annotation test project-${Date.now()}`;
    await projectNameInput.fill(projectName);
    await projectForm
      .getByTestId("project-description")
      .fill("Project for the logged-in annotation test");
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("project.create") && response.status() === 200,
      ),
      projectForm.getByTestId("add-project").click(),
    ]);

    const projectsTable = page.getByRole("table").first();
    const projectRow = projectsTable
      .getByRole("row")
      .filter({ hasText: projectName })
      .first();
    await expect(projectRow).toBeVisible({ timeout: 30000 });
    await Promise.all([
      page.waitForURL(/\/projects\/\d+\/?$/, { timeout: 30000 }),
      projectRow.getByTestId("view-project-link").click(),
    ]);

    await page.getByTestId("documents-tab").click();
    await page.getByTestId("open-documents-modal").click();
    const uploadDialog = page.getByRole("dialog", { name: /Add documents/ });
    await expect(uploadDialog).toBeVisible();

    const documentNames = [
      "lorem-ipsum.txt",
      "casablanca.txt",
      "the-godfather.txt",
      "the-wizard-of-oz.txt",
    ];
    const fileChooserPromise = page.waitForEvent("filechooser");
    await uploadDialog.getByRole("button", { name: "Choose files" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(
      documentNames.map((name) => path.join(__dirname, "input", name)),
    );
    await expect(uploadDialog.getByText("4 documents ready")).toBeVisible();
    await uploadDialog.getByRole("button", { name: "Upload documents" }).click();
    await expect(page.getByText(/document\(s\) uploaded/)).toBeVisible({
      timeout: 60000,
    });
    // for (const documentName of documentNames) {
    //   await expect(
    //     page.getByRole("row").filter({ hasText: documentName }).first(),
    //   ).toBeVisible({ timeout: 30000 });
    // }

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

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("task.create") && response.status() === 200,
      ),
      taskDialog.getByTestId("create-tasks").click(),
    ]);
    await expect(taskDialog).toBeHidden({ timeout: 15000 });

    const taskRow = page
      .getByTestId("tasks-table")
      .getByRole("row")
      .filter({ hasText: taskName })
      .first();
    await expect(taskRow).toBeVisible({ timeout: 30000 });
    await Promise.all([
      page.waitForURL(/\/projects\/\d+\/tasks\/\d+/, {
        timeout: 30000,
      }),
      taskRow.getByTestId("view-task-link").click(),
    ]);

    const addMyself = page.getByText("Add myself", { exact: true });
    await expect(addMyself).toBeVisible({ timeout: 15000 });
    await addMyself.click();
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
    await Promise.all([
      page.waitForURL(/\/tasks\/\d+\/?$/, { timeout: 30000 }),
      assignedTaskRow.getByTestId("view-task-link").click(),
    ]);

    const annotateNext = page.getByTestId("annotate-next-assignment-button");
    await expect(annotateNext).toBeVisible({ timeout: 30000 });
    await Promise.all([
      page.waitForURL(/\/annotate\/\d+\/?/, { timeout: 30000 }),
      annotateNext.click(),
    ]);
    const documentText = page.locator(".lak-annotator .document__text").first();
    await expect(documentText).toBeVisible({ timeout: 30000 });
    await documentText.scrollIntoViewIfNeeded();
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
  } finally {
    await context.close();
  }
});
