import { test, expect } from '@playwright/test';
import { delay } from './utils';

test('Not logged in user goes to documentation and downloads an ECLI', async ({ browser, page }) => {
    test.setTimeout(120000);
    await page.goto('localhost:3000/archives');
    await expect(page.getByText("Provide ECLIs", { exact: true })).toBeVisible();

    const eclisInput = page.getByTestId('eclis');
    await eclisInput.pressSequentially('ECLI:NL:RBLIM:2023:7197', { delay: 100 });
    await eclisInput.press('Enter');
    
    await page.getByTestId('download-button').click();
    await delay(3000);
});

