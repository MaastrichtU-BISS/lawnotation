import { test, expect } from '@playwright/test';
import { delay } from './utils';
import path from 'node:path';


test('Not logged in user goes to documentation and downloads an ECLI', async ({ browser, page }) => {
    test.setTimeout(120000);
    await page.goto('localhost:3000/archives');
    await expect(page.getByText("Provide ECLIs", { exact: true })).toBeVisible();

    await page.getByTestId('eclis').fill('ECLI:NL:RBLIM:2023:7197');
    await page.getByTestId('eclis').press('Tab');
    await delay(3000);

    await page.getByTestId('download-button').click();

});

