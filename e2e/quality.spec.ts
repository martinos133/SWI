import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, login } from "./helpers";

const PAGES: { account: string | null; paths: string[] }[] = [
  { account: null, paths: ["/login", "/sso", "/neexistujuca-stranka"] },
  { account: "kollar", paths: ["/student", "/student/ziadost", "/student/doklady", "/student/odvolanie"] },
  {
    account: "muha",
    paths: ["/referent", "/referent?stav=vsetky", "/referent/poradie", "/referent/terminy", "/audit", "/audit?zalozka=emaily"],
  },
  { account: "galova", paths: ["/komisia", "/komisia/kriteria"] },
  { account: "francisci", paths: ["/spravca"] },
];

for (const { account, paths } of PAGES) {
  test(`prístupnosť a mobil: ${account ?? "verejné stránky"}`, async ({ page }) => {
    if (account) await login(page, account);
    for (const path of paths) {
      await test.step(path, async () => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(path);
        await expectAccessible(page);
        await page.setViewportSize({ width: 375, height: 812 });
        await page.reload();
        await expectNoHorizontalScroll(page);
      });
    }
  });
}

test("prístupnosť a mobil: detail žiadosti u referenta", async ({ page }) => {
  await login(page, "muha");
  await page.goto("/referent?stav=vsetky");
  await page.locator("tbody a").first().click();
  await page.waitForURL(/\/referent\/ziadosti\//);
  await expectAccessible(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await expectNoHorizontalScroll(page);
  await expect(page.getByRole("heading", { name: "Doklady" })).toBeVisible();
});
