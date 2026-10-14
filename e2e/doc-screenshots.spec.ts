import { test, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Snímky 1440 × 900 pre kapitolu 6.2 dokumentu DNR (obrázky 12 – 25).
 * Spúšťa sa cez `npm run screenshots`, ukladajú sa do docs/screenshots/dnr.
 */

test.describe.configure({ mode: "serial" });

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `docs/screenshots/dnr/${name}.png`, animations: "disabled" });

async function scrollTo(page: Page, text: string) {
  await page.getByRole("heading", { name: text }).first().evaluate((el) => {
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90 });
  });
}

test("snímky pre DNR", async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto("/login");
  await shot(page, "12-prihlasenie");

  await page.goto("/sso");
  await page.getByRole("button", { name: /Lucia Nováková/ }).click();
  await page.waitForURL("**/login/overenie");
  await shot(page, "13-druhy-faktor");

  await login(page, "novakova");
  await page.getByRole("button", { name: "Začať vypĺňať žiadosť" }).click();
  await page.waitForURL("**/student/ziadost");
  await shot(page, "14-udaje-z-ais");

  await page.getByLabel("Telefón").fill("+421 905 123 456");
  await page.getByRole("button", { name: "Mladosť", exact: true }).click();
  await page.getByRole("button", { name: "Horský park", exact: true }).click();
  await page.getByRole("button", { name: "Družba", exact: true }).click();
  await page.getByText("Dvojlôžková").click();
  await page.getByText(/Uložené o/).waitFor();
  await scrollTo(page, "Kde chcete bývať");
  await shot(page, "15-preferencie");
  await scrollTo(page, "Typ izby");
  await shot(page, "16-ukladanie-a-podanie");

  await login(page, "kollar");
  await shot(page, "17-stav-ziadosti");
  await page.goto("/student/doklady");
  await shot(page, "18-vyzva-na-doplnenie");

  await login(page, "muha");
  await shot(page, "19-zoznam-referenta");
  await page.getByRole("link", { name: "Samuel Oravec" }).click();
  await page.waitForURL(/\/referent\/ziadosti\//);
  await shot(page, "20-posudenie-dokladu");

  await page.goto("/referent/poradie");
  await page.getByRole("button", { name: "Vypočítať poradie" }).click();
  await page.waitForURL(/beh=/);
  await page.getByText("body sa zhodujú").waitFor();
  await scrollTo(page, "Poradie a pridelenie");
  await shot(page, "21-vypocet-poradia");

  await page.goto("/referent/terminy");
  await shot(page, "22-terminy");

  await login(page, "galova");
  await page.goto("/komisia/kriteria");
  await shot(page, "23-kriteria");

  await login(page, "francisci");
  await shot(page, "24-kapacity");

  await login(page, "muha");
  await page.goto("/audit");
  await shot(page, "25-audit");
});
