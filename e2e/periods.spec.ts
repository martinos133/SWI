import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, login } from "./helpers";

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

test("termín sa dá vybrať z kalendára aj napísať", async ({ page }) => {
  await login(page, "muha");
  await page.goto("/referent/terminy");
  const field = page.getByLabel("Koniec podávania", { exact: true });
  const hidden = page.locator('input[type="hidden"][name="submitTo"]');
  const original = await hidden.inputValue();

  // Kalendár: otvorí sa na zvolenom dni, šípkami sa posunie o deň a týždeň.
  await page.getByRole("button", { name: /^Vybrať dátum, zvolený .*januára 2027/ }).first().click();
  const calendar = page.getByRole("dialog");
  await expect(calendar.getByRole("grid")).toBeVisible();
  await expect(calendar.getByRole("button", { pressed: true })).toBeFocused();
  await expectAccessible(page);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(calendar).toBeHidden();
  const [y, m, d] = original.split("-").map(Number);
  const picked = new Date(y, m - 1, d + 8);
  await expect(field).toHaveValue(`${picked.getDate()}. ${picked.getMonth() + 1}. ${picked.getFullYear()}`);

  // Mesiac sa dá prepnúť myšou a Escape kalendár zavrie bez zmeny.
  await page.getByRole("button", { name: /^Vybrať dátum, zvolený .*2027/ }).nth(0).click();
  await calendar.getByRole("button", { name: "Nasledujúci mesiac" }).click();
  await expect(calendar.getByText("február 2027")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(calendar).toBeHidden();

  // Písanie: platný dátum sa prevedie, neplatný sa označí ako chyba.
  await field.fill("20.1.2027");
  await field.blur();
  await expect(field).toHaveValue("20. 1. 2027");
  await expect(hidden).toHaveValue("2027-01-20");
  await field.fill("31.2.2027");
  await field.blur();
  await expect(field).toHaveAttribute("aria-invalid", "true");

  // Na mobile sa otvorený kalendár zmestí na obrazovku.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await page.getByRole("button", { name: /^Vybrať dátum/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoHorizontalScroll(page);
});
