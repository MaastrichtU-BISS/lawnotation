import { test, expect } from '@playwright/test';
import { delay } from './utils';
import path from 'node:path';


test('Annotator creates project, task, uploads document and assigns task', async ({ browser }) => {
    test.setTimeout(240000);
    const annotatorContext = await browser.newContext({ storageState: 'playwright/.auth/annotator.json' });
    const annotatorPage = await annotatorContext.newPage();
    await annotatorPage.goto('/');

    // Annotator assert if there are no assignments
    await annotatorPage.getByTestId('assigned-tasks-menu-item').waitFor();
    await annotatorPage.getByTestId('assigned-tasks-menu-item').click();
    await expect(annotatorPage.getByText('Showing 0 of 0')).toBeVisible();

    // Editor creates a project
    const editorContext = await browser.newContext({ storageState: 'playwright/.auth/editor.json' });
    const editorPage = await editorContext.newPage();
    await editorPage.goto('/');
    await editorPage.getByTestId('projects-link').click();
    await editorPage.getByText("Don't show again", { exact: true }).waitFor();
    await editorPage.getByTestId('open-projects-modal').click();
    await editorPage.getByTestId('project-name').fill('Test project');
    await editorPage.getByTestId('add-project').click();
    await delay(3000);
    const row = editorPage.getByRole('table').locator('tbody').locator('tr').first();
    const viewButton = row.getByRole('button', { name: 'View' });
    await viewButton.waitFor();
    await expect(viewButton).toBeVisible();
    await viewButton.click();
    await expect(editorPage.getByText("Upload dataset", { exact: true })).toBeVisible()

    // Editor uploads document
    await editorPage.getByTestId('documents-tab').click();
    await editorPage.getByTestId('open-documents-modal').click();
    const fileChooserPromise = editorPage.waitForEvent('filechooser');
    await editorPage.getByText("Select", { exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'input', 'Test.txt'));
    await editorPage.getByTestId('upload-documents').click();

    // Editor creates task
    await editorPage.getByTestId('open-tasks-modal').waitFor();
    await editorPage.getByTestId('open-tasks-modal').click();
    await editorPage.getByTestId('task-name').fill('Test task');
    await editorPage.getByTestId('task-description').fill('Test discription');
    await editorPage.getByTestId('select-labelset').click();
    await editorPage.getByText('Seeded labelset').click();
    await editorPage.getByLabel('Span').click();
    await editorPage.getByTestId('create-tasks').click();

    // Editor assigns task
    const projectRow = editorPage.getByRole('table').locator('tbody').locator('tr').first();
    const assignButton = projectRow.getByLabel('Assign');
    await expect(assignButton).toBeVisible();
    await assignButton.click();
    await editorPage.getByText('Add myself').click();
    const inputEmail = editorPage.getByTestId('annotator-emails');
    await inputEmail.pressSequentially('annotator@example.com', { delay: 100 });
    await inputEmail.press('Enter');
    await editorPage.getByTestId('create-assignments').click();


    // Annotator assert if there is an assignment
    await annotatorPage.reload();
    await annotatorPage.getByTestId('assigned-tasks-menu-item').click();
    await annotatorPage.getByText('Showing 1 - 1 of 1').isVisible()


    // Editor deletes project
    await editorPage.getByTestId('projects-link').click();
    await projectRow.getByRole("checkbox").click();
    await editorPage.getByTestId("remove-selected-rows").click();
    await editorPage.getByRole('button', { name: 'Confirm' }).click();
    await expect(editorPage.getByRole("alert").getByText("Items succesfully removed")).toBeVisible();
});

