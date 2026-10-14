import { test, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Screenshoty pre kapitolu 6.2 dokumentu (Výsledok experimentu).
 * Spúšťa sa cez `npm run screenshots`, obrázky sa uložia do docs/screenshots.
 */

test.describe.configure({ mode: "serial" });

const shot = (page: Page, name: string, fullPage = false) =>
  page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage, animations: "disabled" });

test("screenshoty celého konania", async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto("/login");
  await shot(page, "01-prihlasenie");

  await page.goto("/sso");
  await shot(page, "02-univerzitne-sso");
  await page.getByRole("button", { name: /Lucia Nováková/ }).click();
  await page.waitForURL("**/login/overenie");
  await shot(page, "03-dvojfaktorove-overenie");

  await login(page, "novakova");
  await shot(page, "04-student-bez-ziadosti");
  await page.getByRole("button", { name: "Začať vypĺňať žiadosť" }).click();
  await page.waitForURL("**/student/ziadost");
  await page.getByLabel("Telefón").fill("+421 905 123 456");
  await page.getByRole("button", { name: "Mladosť", exact: true }).click();
  await page.getByRole("button", { name: "Horský park", exact: true }).click();
  await page.getByText("Dvojlôžková").click();
  await page.getByText(/Uložené o/).waitFor();
  await shot(page, "05-formular-ziadosti", true);
  await page.getByRole("button", { name: "Podať žiadosť" }).click();
  await page.waitForURL("**/student");
  await shot(page, "06-student-ziadost-podana");

  await login(page, "kollar");
  await shot(page, "07-student-caka-na-doplnenie");
  await page.goto("/student/doklady");
  await shot(page, "08-doklady-vyzva-na-doplnenie");

  await login(page, "kovacova");
  await shot(page, "09-referent-zoznam-ziadosti");
  await page.getByRole("link", { name: "Samuel Oravec" }).click();
  await page.waitForURL(/\/referent\/ziadosti\//);
  await shot(page, "10-referent-posudenie-dokladov", true);
  await page.goto("/referent/terminy");
  await shot(page, "11-referent-terminy");

  await login(page, "horvath");
  await page.goto("/komisia/kriteria");
  await shot(page, "12-komisia-kriteria-a-vahy", true);

  await login(page, "balaz");
  await shot(page, "13-spravca-kapacity", true);

  await login(page, "kovacova");
  await page.goto("/referent/poradie");
  await page.getByRole("button", { name: "Vypočítať poradie" }).click();
  await page.waitForURL(/beh=/);
  await shot(page, "14-poradie-navrh-pridelenia", true);
  await page.getByRole("button", { name: "Potvrdiť pridelenie" }).click();
  await shot(page, "15-potvrdenie-pridelenia");
  await page.getByRole("button", { name: /Prideliť \d+ miest/ }).click();
  await page.getByText("Potvrdený").first().waitFor();

  await page.goto("/referent?stav=rozhodnute");
  const assignedLogin = (
    await page.locator("tbody tr").filter({ hasText: "Miesto pridelené" }).first().locator("p").first().innerText()
  ).split(",")[0];
  const waitingLogin = (
    await page.locator("tbody tr").filter({ hasText: "Náhradník" }).first().locator("p").first().innerText()
  ).split(",")[0];

  await login(page, assignedLogin);
  await shot(page, "16-student-pridelene-miesto", true);

  await login(page, waitingLogin);
  await page.goto("/student/odvolanie");
  await page
    .getByLabel("Dôvod odvolania")
    .fill("Od septembra sa mi zmenila situácia doma, otec prišiel o prácu. Prikladám potvrdenie z úradu práce, ktoré som v čase podania žiadosti ešte nemal.");
  await shot(page, "17-student-odvolanie");
  await page.getByRole("button", { name: "Podať odvolanie" }).click();
  await page.getByText("Posudzuje sa").waitFor();

  await login(page, "horvath");
  await page.getByRole("radio", { name: "Vyhovieť" }).click();
  await page.getByLabel("Úprava bodov").fill("5");
  await page
    .getByLabel("Odôvodnenie pre študenta")
    .fill("Komisia uznala zmenu sociálnej situácie doloženú potvrdením z úradu práce.");
  await shot(page, "18-komisia-rozhodnutie-o-odvolani", true);
  await page.getByRole("button", { name: "Vyhovieť odvolaniu" }).click();
  await page.getByText("Vyhovené").waitFor();

  await page.goto("/audit");
  await shot(page, "19-auditny-zaznam");
  await page.goto("/audit?zalozka=emaily");
  await shot(page, "20-odoslane-emaily");

  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, assignedLogin);
  await shot(page, "21-mobil-pridelene-miesto");
  await login(page, "kollar");
  await page.goto("/student/ziadost");
  await shot(page, "22-mobil-formular");
});
