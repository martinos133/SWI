import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Prihlásenie cez simulované SSO a druhý faktor (kód z ukážkového režimu). */
export async function login(page: Page, account: string) {
  await page.context().clearCookies();
  await page.goto("/sso");
  await page.getByLabel("Používateľské meno").fill(account);
  await page.getByRole("button", { name: "Prihlásiť", exact: true }).click();
  await page.waitForURL("**/login/overenie");
  const code = (await page.locator("aside p").last().innerText()).replace(/\s/g, "");
  await page.getByLabel("Overovací kód").fill(code);
  await page.getByRole("button", { name: "Overiť a pokračovať" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** Prístupnosť podľa WCAG 2.2 A/AA – test zlyhá na závažných a kritických chybách. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`),
  ).toEqual([]);
}

/** Stránka sa nesmie posúvať do strany. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
