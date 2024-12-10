import { test, expect } from '@playwright/test';
import { delay } from './utils';
import path from 'node:path';


test('editor creates project, task, a new labelset and edits project and task', async ({ browser }) => {
    test.setTimeout(120000);
    const editorContext = await browser.newContext({ storageState: 'playwright/.auth/annotator.json' });
    const editorPage = await editorContext.newPage();
    await editorPage.goto('/');


    // Editor creates project
    await editorPage.getByTestId('projects-link').waitFor();
    await editorPage.getByTestId('projects-link').click();
    await editorPage.getByText("Don't show again", { exact: true }).waitFor();
    await editorPage.getByTestId('open-projects-modal').click();
    await editorPage.getByTestId('project-name').fill('Test project v2');
    await editorPage.getByTestId('project-description').fill('This is the description');
    await editorPage.getByTestId('add-project').click();
    await delay(3000);
    const row = editorPage.getByRole('table').locator('tbody').locator('tr').first();
    const viewButton = row.getByRole('button', { name: 'View' });
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    // Editor creates task
    await editorPage.getByTestId('tasks-tab').click();
    await editorPage.getByTestId('open-tasks-modal').click();
    await editorPage.getByTestId('task-name').fill('Test');
    await editorPage.getByTestId('task-description').fill('This is a test description');
    await editorPage.getByLabel('Text').click();
    await editorPage.getByLabel('Symbol').click();

    // Editor creates labelset
    await editorPage.getByTestId('create-new-labelset').click();
    await editorPage.getByTestId('labelset-description').click();
    await editorPage.getByTestId('labelset-name').fill('labelset test');
    await editorPage.getByTestId('labelset-description').fill('test');
    await editorPage.getByTestId('label-name').fill('First');
    await editorPage.getByTestId('add-label').click();
    await editorPage.getByTestId('label-name').fill('Second');
    await editorPage.getByTestId('add-label').click();
    await editorPage.getByTestId('label-name').fill('Third');
    await editorPage.getByTestId('add-label').click();
    await editorPage.getByTestId('save-labelset').click();

    await editorPage.getByTestId('create-tasks').click();
    await delay(3000);

    // Editor edits a task
    const editRow = editorPage.getByRole('table').locator('tbody').locator('tr').first();
    const editsButton = editRow.getByLabel('Edit');
    await expect(editsButton).toBeVisible();
    await editsButton.click();
    await editorPage.getByTestId('task-name').fill('Task test');
    await editorPage.getByTestId('save-changes-button').click();
    await delay(3000);

    // Editor edits project
    await editorPage.getByTestId('projects-link').click();
    const projectRow = editorPage.getByRole('table').locator('tbody').locator('tr').first();
    const editedButton = projectRow.getByLabel('Edit');
    await expect(editedButton).toBeVisible();
    await editedButton.click();
    await editorPage.getByTestId('project-name').fill('Test project');
    await editorPage.getByTestId('save-changes-button').click();
    await delay(3000);

    // Editor deletes project
    await editorPage.getByTestId('checkbox').first().check();
    await editorPage.getByTestId('remove-selected-rows').click();
    await editorPage.getByLabel('Yes, delete').click();
    await expect(editorPage.getByRole("alert").getByText("Items succesfully removed")).toBeVisible();
});
