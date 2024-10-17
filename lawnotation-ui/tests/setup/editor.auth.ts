import { test as setup } from '@playwright/test';
import { delay } from '../utils';

const editorFile = 'playwright/.auth/editor.json';

setup('Authenticate as editor', async ({ context, page }) => {
  await page.goto('localhost:3000');
  await delay(1000);
  const emailField = page.getByTestId('email-field-to-login');
  await emailField.fill('editor@example.com');
  await emailField.press('Enter');
  await delay(3000);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const magicLinkPage = await context.newPage();
  await magicLinkPage.goto('http://127.0.0.1:54324/m/editor');
  await magicLinkPage.getByText('Your login code for').first().click();
  const magicCode = await magicLinkPage.locator('#login-code').innerText();

  await page.getByRole("textbox").first().fill(magicCode);
  await page.getByTestId('verify-button').click();
  await page.getByText('Create new project').waitFor();
  await page.getByText('Create new project').isVisible();

  await page.context().storageState({ path: editorFile });
});