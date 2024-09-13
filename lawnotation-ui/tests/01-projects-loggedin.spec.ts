import { test, expect } from '@playwright/test';
import { delay } from './utils';
import path from 'node:path';


test('Annotator goes to assignements and assert no assignments', async ({ browser }) => {
    test.setTimeout(120000);
    const annotatorContext = await browser.newContext({ storageState: 'playwright/.auth/annotator.json' });
    const annotatorPage = await annotatorContext.newPage();
    await annotatorPage.goto('localhost:3000');
    await annotatorPage.getByTestId('assigned-tasks-menu-item').click();
    await expect(annotatorPage.getByText('Showing 0 of 0')).toBeVisible();
});

test('Editor creates labelset', async ({ browser }) => {
    test.setTimeout(120000);
    const editorContext = await browser.newContext({ storageState: 'playwright/.auth/editor.json' });
    const editorPage = await editorContext.newPage();
    await editorPage.goto('localhost:3000');
    await editorPage.getByTestId('labelset-link').click();
    await editorPage.getByTestId('create-new-labelset').click();
    await editorPage.getByLabel('Breadcrumb').waitFor();
    await editorPage.getByTestId('labelset-name').fill('Test labelset');
    await editorPage.getByTestId('labelset-description').fill('Labelset description');
    await editorPage.getByTestId('label-name').fill('First label');
    await editorPage.getByTestId('add-label').click();
    await expect(editorPage.getByText('First label')).toBeVisible();
    await editorPage.getByTestId('label-name').fill('Second label');
    await editorPage.getByTestId('add-label').click();
    await expect(editorPage.getByText('Second label')).toBeVisible();
    await editorPage.getByTestId('delete-label').last().click();
    await expect(editorPage.getByText('Second label')).not.toBeVisible();
    await editorPage.getByTestId('label-name').fill('Second label');
    await editorPage.getByTestId('add-label').click();
    await expect(editorPage.getByText('Second label')).toBeVisible();
    await editorPage.getByTestId('save-labelset').click();
    await expect(editorPage.getByRole('table').locator('tbody').locator('tr')).toHaveCount(3);
    await editorPage.getByTestId('checkbox').first().check();
    await editorPage.getByTestId('remove-selected-rows').click();
    await editorPage.getByText('Confirm').click();
    await expect(editorPage.getByRole('table').locator('tbody').locator('tr')).toHaveCount(2);
});

test('Editor creates project, adds a document and task, and assigns the task', async ({ browser }) => {
    test.setTimeout(120000);
    const editorContext = await browser.newContext({ storageState: 'playwright/.auth/editor.json' });
    const editorPage = await editorContext.newPage();
    await editorPage.goto('localhost:3000');
    await editorPage.getByRole('link', { name: 'Create new project' }).click();
    await editorPage.getByText("Don't show again", { exact: true }).waitFor();
    await editorPage.getByTestId('open-projects-modal').click();
    await editorPage.getByTestId('project-name').fill('Test project');
    await editorPage.getByTestId('add-project').click();
    await delay(3000);
    const row = editorPage.getByRole('table').locator('tbody').locator('tr').first();
    const viewButton = row.getByRole('button', { name: 'View' });
    await expect(viewButton).toBeVisible();
    await viewButton.click();
    await expect(editorPage.getByText("Upload dataset", { exact: true })).toBeVisible()

    // Document
    await editorPage.getByTestId('documents-tab').click();
    await editorPage.getByTestId('open-documents-modal').click();
    const fileChooserPromise = editorPage.waitForEvent('filechooser');
    await editorPage.getByText("Select", { exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'input', 'Test.txt'));
    await editorPage.getByTestId('upload-documents').click();

    // Tasks
    await editorPage.getByTestId('open-tasks-modal').waitFor();
    await editorPage.getByTestId('open-tasks-modal').click();
    await editorPage.getByTestId('task-name').fill('Test task');
    await editorPage.getByTestId('task-description').fill('Test discription');
    await editorPage.getByText('Create new labelset').click();
    await editorPage.getByTestId('labelset-name').fill('Test labelset');
    await editorPage.getByTestId('labelset-description').fill('Test discription');
    await editorPage.getByTestId('label-name').fill('First');
    await editorPage.getByTestId('add-label').click();
    await editorPage.getByTestId('label-name').fill('Second');
    await editorPage.getByTestId('add-label').click();
    await editorPage.getByTestId('label-name').fill('Third');
    await editorPage.getByTestId('add-label').click();
    await editorPage.getByTestId('save-labelset').click();
    await editorPage.getByLabel('Select Labelset').click();
    await editorPage.getByText('Seeded labelset').click();
    await editorPage.getByLabel('Span').click();
    await editorPage.getByTestId('create-tasks').click();
    await delay(4000)
    const projectRow = editorPage.getByRole('table').locator('tbody').locator('tr').first();
    const assignButton = projectRow.getByLabel('Assign');
    await expect(assignButton).toBeVisible();
    await assignButton.click();
    await editorPage.getByText('Add myself').click();
    const inputEmail = editorPage.getByTestId('annotator-emails');
    await editorPage.getByTestId('annotator-emails').fill('annotator@example.com');
    await inputEmail.press('Enter');
    await editorPage.getByTestId('create-assignments').click();
});
