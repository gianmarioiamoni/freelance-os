// tests/e2e/helpers/server-action.ts
import { expect, type Locator, type Page } from "@playwright/test";

function pathFromActionRedirect(header: string, baseUrl: string): string {
  const [path] = header.split(";");
  const url = new URL(path ?? header, baseUrl);
  return `${url.pathname}${url.search}`;
}

export async function submitAndFollowActionRedirect(
  page: Page,
  submit: Locator,
  urlPattern: RegExp,
): Promise<void> {
  const responsePromise = page.waitForResponse((response) => {
    if (response.request().method() !== "POST") {
      return false;
    }

    return (
      response.headers()["x-action-redirect"] !== undefined ||
      response.status() === 303
    );
  });

  await submit.click({ noWaitAfter: true });
  const response = await responsePromise;
  const redirectTo = response.headers()["x-action-redirect"];

  if (redirectTo) {
    await page.goto(pathFromActionRedirect(redirectTo, page.url()));
  }

  await expect(page).toHaveURL(urlPattern);
}
