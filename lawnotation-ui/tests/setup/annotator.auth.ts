import { test as setup } from '@playwright/test';
import { delay } from '../utils';

const annotatorFile = 'playwright/.auth/annotator.json';

setup('Authenticate as annotator', async ({ context, page }) => {
  setup.setTimeout(120000);
  await page.goto('/');
  const emailField = page.getByTestId('email-field-to-login');
  await emailField.waitFor();
  await delay(3000);
  await emailField.pressSequentially('annotator@example.com', { delay: 100 });
  await emailField.press('Enter');
  await page.getByTestId('verify-button').waitFor();

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const magicLinkPage = await context.newPage();
  await magicLinkPage.goto('http://127.0.0.1:54324/');
  await magicLinkPage.getByText('Your login code for').first().click();
  await magicLinkPage.locator('#nav-plain-text-tab').click();
  const text = await magicLinkPage.locator('.text-view').innerText();
  const magicCode = text.match(/[0-9]{6}/)?.[0]!;
  // const magicCode = text.split(':')[1].split('If')[0].trim();
  console.log(magicCode);

  await page.getByRole("textbox").first().fill(magicCode);
  await page.getByTestId('verify-button').click();
  await page.getByText('Create new project').waitFor();
  await page.getByText('Create new project').isVisible();

  await page.context().storageState({ path: annotatorFile });
});