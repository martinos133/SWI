import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe.configure({ mode: "serial" });

test("vyhľadávanie ignoruje diakritiku a veľkosť písmen", async ({ page }) => {
  await login(page, "muha");
  await page.goto("/referent?stav=vsetky&q=CIERNA");
  await expect(page.getByRole("link", { name: "Monika Čierna" })).toBeVisible();
  await page.goto("/referent?stav=vsetky&q=kollar");
  await expect(page.getByRole("link", { name: "Tomáš Kollár" })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);
});

test("referent založí nové konanie a môže sa vrátiť k pôvodnému", async ({ page }) => {
  await login(page, "muha");
  await page.goto("/referent/terminy");
  const current = (await page.getByRole("heading", { level: 1 }).locator("..").innerText()).match(/\d{4}\/\d{2}/)![0];

  await page.getByRole("button", { name: "Založiť nové konanie" }).click();
  const proposed = await page.getByLabel("Akademický rok").inputValue();
  await page.getByRole("button", { name: "Založiť a aktivovať" }).click();
  await expect(page.getByText(`Akademický rok ${proposed}.`)).toBeVisible();

  // Kritériá sú prevzaté, ale čakajú na nové schválenie komisiou.
  await page.goto("/referent/poradie");
  await expect(page.getByText("Kritériá zatiaľ nie sú schválené komisiou.")).toBeVisible();

  await login(page, "galova");
  await page.goto("/komisia/kriteria");
  await expect(page.getByText("Kritériá čakajú na schválenie")).toBeVisible();
  await expect(page.getByLabel("Váha").first()).toHaveValue("40");

  // Duplicitný rok sa nedá založiť.
  await login(page, "muha");
  await page.goto("/referent/terminy");
  await page.getByRole("button", { name: "Založiť nové konanie" }).click();
  await page.getByLabel("Akademický rok").fill(proposed);
  await page.getByRole("button", { name: "Založiť a aktivovať" }).click();
  await expect(page.getByText(`Konanie na rok ${proposed} už existuje.`)).toBeVisible();

  await page
    .getByRole("listitem")
    .filter({ hasText: `Akademický rok ${current}` })
    .getByRole("button", { name: "Nastaviť ako aktívne" })
    .click();
  await expect(page.getByText(`Akademický rok ${current}.`)).toBeVisible();
});

test("minulý akademický rok má overiteľný výpočet a nezaberá kapacitu", async ({ page }) => {
  await login(page, "muha");
  await page.goto("/referent/terminy");
  const rows = page.getByRole("listitem").filter({ hasText: "Akademický rok" });
  const active = (await rows.filter({ has: page.getByText("Aktívne", { exact: true }) }).innerText()).match(/\d{4}\/\d{2}/)![0];
  const previous = rows.filter({ has: page.getByRole("button", { name: "Nastaviť ako aktívne" }) }).last();
  await previous.getByRole("button", { name: "Nastaviť ako aktívne" }).click();
  await expect(page.getByText(/Akademický rok \d{4}\/\d{2}\. Konanie je uzavreté\./)).toBeVisible();

  await page.goto("/referent/poradie");
  await expect(page.getByText("Potvrdený").first()).toBeVisible();
  await expect(page.getByText("body sa zhodujú")).toBeVisible();
  await page.goto("/referent?stav=rozhodnute");
  await expect(page.getByText("Náhradník").first()).toBeVisible();

  await page.goto("/referent/terminy");
  await page
    .getByRole("listitem")
    .filter({ hasText: `Akademický rok ${active}` })
    .getByRole("button", { name: "Nastaviť ako aktívne" })
    .click();
  await expect(page.getByText(`Akademický rok ${active}.`)).toBeVisible();
});
