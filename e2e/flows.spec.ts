import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe.configure({ mode: "serial" });

test("prihlásenie vedie každú rolu na jej úvodnú stránku", async ({ page }) => {
  const homes: [string, string, string][] = [
    ["novakova", "/student", "Dobrý deň, Lucia."],
    ["muha", "/referent", "Žiadosti"],
    ["galova", "/komisia", "Odvolania"],
    ["francisci", "/spravca", "Internáty a kapacity"],
  ];
  for (const [account, path, heading] of homes) {
    await login(page, account);
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
});

test("nesprávny kód 2FA neprihlási", async ({ page }) => {
  await page.goto("/sso");
  await page.getByLabel("Používateľské meno").fill("kollar");
  await page.getByRole("button", { name: "Prihlásiť", exact: true }).click();
  await page.getByLabel("Overovací kód").fill("000000");
  await page.getByRole("button", { name: "Overiť a pokračovať" }).click();
  await expect(page.getByText(/Kód nesedí/)).toBeVisible();
  await page.goto("/student");
  await expect(page).toHaveURL(/\/login/);
});

test("študent sa nedostane k stránkam referenta ani k cudzím dokladom", async ({ page, request }) => {
  const anonymous = await request.get("/doklad/akykolvek", { maxRedirects: 0 });
  expect(anonymous.status()).toBe(307);

  await login(page, "muha");
  await page.getByRole("link", { name: "Samuel Oravec" }).click();
  const foreignDoc = await page.locator('a[href^="/doklad/"]').first().getAttribute("href");

  await login(page, "kollar");
  await page.goto("/referent");
  await expect(page).toHaveURL("/student");
  const forbidden = await page.request.get(foreignDoc!);
  expect(forbidden.status()).toBe(403);
});

test("študentka vyplní, priebežne uloží a podá žiadosť", async ({ page }) => {
  await login(page, "novakova");
  await page.getByRole("button", { name: "Začať vypĺňať žiadosť" }).click();
  await page.waitForURL("**/student/ziadost");
  await expect(page.getByText("Aplikovaná informatika")).toBeVisible();

  await page.getByLabel("Telefón").fill("+421 905 123 456");
  await page.getByRole("button", { name: "Mladosť", exact: true }).click();
  await page.getByRole("button", { name: "Družba", exact: true }).click();
  await page.getByRole("button", { name: "Posunúť Družba vyššie" }).click();
  await expect(page.getByText(/Uložené o/)).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Telefón")).toHaveValue("+421 905 123 456");
  const order = page.locator("ol li p.font-semibold");
  await expect(order).toHaveText(["Družba", "Mladosť"]);

  await page.getByRole("button", { name: "Podať žiadosť" }).click();
  await page.waitForURL("**/student");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Podaná");
});

test("študent doplní vyžiadaný doklad a žiadosť sa vráti na overenie", async ({ page }) => {
  await login(page, "kollar");
  await page.goto("/student/doklady");
  await page.locator("input[type=file]").setInputFiles({
    name: "potvrdenie.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await page.getByRole("button", { name: "Nahrať doklad" }).click();
  await expect(page.getByText("Čaká na overenie").first()).toBeVisible();
  await page.goto("/student");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overuje sa");
});

test("referent posúdi doklady a vyžiada doplnenie", async ({ page }) => {
  await login(page, "muha");
  await page.getByRole("link", { name: "Tomáš Kollár" }).click();
  const income = page.locator("article").filter({ hasText: "Potvrdenie o príjme" });
  await income.getByRole("radio", { name: "2" }).check({ force: true });
  await income.getByRole("button", { name: "Schváliť" }).last().click();
  await expect(income.getByText("Overený")).toBeVisible();

  await page.getByRole("button", { name: "Posunúť na vyhodnotenie" }).click();
  await expect(page.getByText("Vyhodnocuje sa").first()).toBeVisible();
  await expect(page.getByText("Posúdená sociálna situácia")).toBeVisible();
});

test("výpočet poradia neprekročí kapacitu a pridelenie sa dá potvrdiť", async ({ page }) => {
  await login(page, "muha");
  await page.goto("/referent/poradie");
  await page.getByRole("button", { name: "Vypočítať poradie" }).click();
  await page.waitForURL(/beh=/);
  await expect(page.getByText("body sa zhodujú")).toBeVisible();

  const assigned = await page.locator("tbody tr").filter({ hasNotText: "Náhradník" }).count();
  expect(assigned).toBeLessThanOrEqual(14);
  await expect(page.getByText("Náhradník").first()).toBeVisible();

  await page.getByRole("button", { name: "Potvrdiť pridelenie" }).click();
  await page.getByRole("button", { name: /Prideliť \d+ miest/ }).click();
  await expect(page.getByText("Potvrdený").first()).toBeVisible();

  await page.goto("/spravca");
  await expect(page).toHaveURL("/referent");
});

test("študent s prideleným miestom vidí kľúčenku a body", async ({ page }) => {
  await login(page, "muha");
  await page.goto("/referent?stav=rozhodnute");
  const first = page.locator("tbody tr").filter({ hasText: "Miesto pridelené" }).first();
  const studentLogin = (await first.locator("p").first().innerText()).split(",")[0];

  await login(page, studentLogin);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Miesto pridelené");
  await expect(page.getByText("Pridelené miesto", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vaše body" })).toBeVisible();
});

test("náhradník sa odvolá a komisia rozhodne", async ({ page }) => {
  await login(page, "muha");
  await page.goto("/referent?stav=rozhodnute");
  const row = page.locator("tbody tr").filter({ hasText: "Náhradník" }).first();
  const studentLogin = (await row.locator("p").first().innerText()).split(",")[0];

  await login(page, studentLogin);
  await page.goto("/student/odvolanie");
  await page
    .getByLabel("Dôvod odvolania")
    .fill("Zmenila sa mi sociálna situácia, prikladám nové potvrdenie z úradu práce.");
  await page.getByRole("button", { name: "Podať odvolanie" }).click();
  await expect(page.getByText("Posudzuje sa")).toBeVisible();

  await login(page, "galova");
  await page.getByRole("radio", { name: "Vyhovieť" }).click();
  await page.getByLabel("Úprava bodov").fill("5");
  await page
    .getByLabel("Odôvodnenie pre študenta")
    .fill("Komisia uznala zmenu sociálnej situácie, ostávate prvý medzi náhradníkmi.");
  await page.getByRole("button", { name: "Vyhovieť odvolaniu" }).click();
  await expect(page.getByText("Žiadne odvolanie nečaká na rozhodnutie")).toBeVisible();
  await expect(page.getByText("Vyhovené")).toBeVisible();

  await page.goto("/audit?typ=odvolania");
  await expect(page.getByText("Rozhodnutie o odvolaní").first()).toBeVisible();
});

test("opakovane nesprávny kód 2FA zablokuje konto aj pri novom prihlásení", async ({ page }) => {
  // Konto, ktoré ostatné testy nepoužívajú – zablokovanie trvá do ďalšieho seedu.
  const account = "kolesar22";
  const ssoSignIn = async () => {
    await page.context().clearCookies();
    await page.goto("/sso");
    await page.getByLabel("Používateľské meno").fill(account);
    await page.getByRole("button", { name: "Prihlásiť", exact: true }).click();
  };
  // Po každom kóde počká na odpoveď servera, aby sa započítal každý pokus.
  const wrongCode = async (expected?: string) => {
    await page.getByLabel("Overovací kód").fill("000000");
    await page.getByRole("button", { name: "Overiť a pokračovať" }).click();
    if (expected) await expect(page.getByRole("alert").filter({ hasText: "Kód nesedí" })).toHaveText(expected);
  };

  await ssoSignIn();
  await wrongCode("Kód nesedí. Zostávajú 4 pokusy.");
  await wrongCode("Kód nesedí. Zostávajú 3 pokusy.");
  await wrongCode("Kód nesedí. Zostávajú 2 pokusy.");

  // Nové prihlásenie cez SSO pokusy nevynuluje.
  await ssoSignIn();
  await wrongCode("Kód nesedí. Zostávajú 1 pokus.");
  await wrongCode();
  await expect(page).toHaveURL("/login?dovod=pokusy");
  await expect(page.getByText("Kód ste zadali nesprávne priveľakrát. Konto je na 15 minút zablokované.")).toBeVisible();

  await ssoSignIn();
  await expect(page.getByText(/dočasne zablokované/)).toBeVisible();
  await expect(page).toHaveURL("/sso");

  await login(page, "muha");
  await page.goto("/audit?typ=prihlasenie");
  await expect(page.getByText("Konto dočasne zablokované po nesprávnych kódoch 2FA").first()).toBeVisible();
});
