import { test, expect, type Browser, type Page } from "@playwright/test";

// The dashboard must open in the right view straight away. Before the fix an
// annotator first saw the editor view, which then switched to the annotator
// view once the data had loaded in the browser.

const annotatorState = "playwright/.auth/annotator.json";
const editorState = "playwright/.auth/editor.json";

async function newPage(browser: Browser, storageState: string, javaScriptEnabled = true) {
  const context = await browser.newContext({ storageState, javaScriptEnabled });
  const page = await context.newPage();

  // button was ever shown as selected, so a brief flash of the wrong view fails the test.
  await page.addInitScript(() => {
    const seen = new Set<string>();
    (window as any).__dashboardRolesSeen = seen;
    const record = () => {
      document
        .querySelectorAll('button[aria-pressed="true"]')
        .forEach((button) => seen.add(button.textContent?.trim() ?? ""));
    };
    new MutationObserver(record).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-pressed"],
    });
  });

  return page;
}

// Server-rendered buttons are visible before Vue attaches its click handlers,
// so a click that lands too early does nothing. Wait until the app is mounted.
async function waitForHydration(page: Page) {
  await page.waitForFunction(() => Boolean((document.querySelector("#__nuxt") as any)?.__vue_app__));
  await page.waitForLoadState("networkidle");
}

async function openDashboardFromUserMenu(page: Page, userName: string) {
  await page.goto("/");
  await waitForHydration(page);
  await page.getByRole("button", { name: userName }).click();
  await page.getByRole("menuitem", { name: "Dashboard" }).click();
  await page.waitForURL("**/dashboard");
}

const rolesSeen = (page: Page) =>
  page.evaluate(() => [...((window as any).__dashboardRolesSeen as Set<string>)]);

test.describe("Dashboard", () => {
  test("annotator opening it from the user menu only ever sees the annotator view", async ({ browser }) => {
    const page = await newPage(browser, annotatorState);
    await openDashboardFromUserMenu(page, "annotator");

    await expect(page.getByRole("button", { name: "Annotator view", pressed: true })).toBeVisible();
    await expect(page.getByText("Assigned projects")).toBeVisible();
    await expect(page.getByText("Loading dashboard data...")).toBeHidden();
    expect(await rolesSeen(page)).toEqual(["Annotator view"]);

    await page.context().close();
  });

  test("the server already renders the annotator view (JavaScript disabled)", async ({ browser }) => {
    const page = await newPage(browser, annotatorState, false);
    await page.goto("/dashboard");

    await expect(page.getByRole("button", { name: "Annotator view", pressed: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Editor view", pressed: false })).toBeVisible();
    await expect(page.getByText("Assigned projects")).toBeVisible();
    await expect(page.getByText("Loading dashboard data...")).toHaveCount(0);

    await page.context().close();
  });

  test("annotator can switch to the editor view and back", async ({ browser }) => {
    const page = await newPage(browser, annotatorState);
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Annotator view", pressed: true })).toBeVisible();
    await waitForHydration(page);

    // The editor data is only fetched now; the seeded annotator owns no projects.
    await page.getByRole("button", { name: "Editor view" }).click();
    await expect(page.getByRole("button", { name: "Editor view", pressed: true })).toBeVisible();
    await expect(page.getByText("No projects yet")).toBeVisible();

    await page.getByRole("button", { name: "Annotator view" }).click();
    await expect(page.getByText("Assigned projects")).toBeVisible();
    await expect(page.getByText("No project data available")).toBeHidden();

    await page.context().close();
  });

  test("editor opening it from the user menu only ever sees the editor view", async ({ browser }) => {
    const page = await newPage(browser, editorState);
    await openDashboardFromUserMenu(page, "editor");

    await expect(page.getByRole("button", { name: "Editor view", pressed: true })).toBeVisible();
    await expect(page.getByText("Owned projects")).toBeVisible();
    expect(await rolesSeen(page)).toEqual(["Editor view"]);

    await page.context().close();
  });
});
