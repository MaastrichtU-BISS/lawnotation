import { test, expect } from '@playwright/test';
import { delay } from './utils';

test('Annotator goes to assignements and assert no assignments', async ({ browser }) => {
    const annotatorContext = await browser.newContext({ storageState: 'playwright/.auth/annotator.json' });
    const annotatorPage = await annotatorContext.newPage();
    await annotatorPage.goto('localhost:3000');
    await annotatorPage.getByTestId('assigned-tasks-menu-item').click();
    await expect(annotatorPage.getByText('Showing 0 of 0')).toBeVisible();
});

test('Editor creates labels', async ({ browser }) => {
    const editorContext = await browser.newContext({ storageState: 'playwright/.auth/editor.json' });
    const editorPage = await editorContext.newPage();
    await editorPage.goto('localhost:3000');
    await editorPage.getByTestId('labelset-link').click();
    await editorPage.getByTestId('create-new-labelset').click();
    await delay(3000);
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