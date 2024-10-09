import { test, expect } from '@playwright/test';
import { delay } from './utils';

test('Not logged in user goes to documentation and downloads an ECLI', async ({ browser, page }) => {
    test.setTimeout(120000);
    await page.goto('/archives');
    await expect(page.getByText("Provide ECLIs", { exact: true })).toBeVisible();

    const eclisInput = page.getByTestId('eclis');
    await eclisInput.pressSequentially('ECLI:NL:RBLIM:2023:7197', { delay: 100 });
    await eclisInput.press('Enter');

    await page.getByTestId('download-button').click();
    await page.getByRole("alert").waitFor();
    await expect(page.getByRole("alert")).toContainText("One .zip file containing 1 documents has been downloaded!");
});

