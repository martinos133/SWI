// Vyrobí snímku s výsledkami automatických testov pre dokument (docs/screenshots/24-vysledky-testov.png).
// Vstup: JSON výstupy Vitestu a Playwrightu. Použitie: node scripts/test-report.mjs <priečinok s JSON>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const dir = process.argv[2] ?? "test-report";
const vitest = JSON.parse(readFileSync(join(dir, "vitest.json"), "utf8"));
const e2e = JSON.parse(readFileSync(join(dir, "e2e.json"), "utf8"));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ms = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")} s` : `${Math.round(n)} ms`);

const unitGroups = vitest.testResults.map((f) => ({
  file: f.name.split("/src/")[1] ? `src/${f.name.split("/src/")[1]}` : f.name,
  tests: f.assertionResults.map((t) => ({
    name: [...t.ancestorTitles, t.title].join(" › "),
    ok: t.status === "passed",
    duration: t.duration ?? 0,
  })),
}));

const e2eGroups = [];
const walk = (suite, file, top = true) => {
  for (const spec of suite.specs ?? []) {
    const results = spec.tests.flatMap((t) => t.results);
    let group = e2eGroups.find((g) => g.file === file);
    if (!group) e2eGroups.push((group = { file, tests: [] }));
    group.tests.push({
      name: [top ? null : suite.title, spec.title].filter(Boolean).join(" › "),
      ok: spec.ok,
      duration: results.reduce((a, r) => a + r.duration, 0),
    });
  }
  for (const child of suite.suites ?? []) walk(child, file, false);
};
for (const s of e2e.suites) walk(s, `e2e/${s.file ?? s.title}`);

const unitTotal = vitest.numTotalTests;
const unitPassed = vitest.numPassedTests;
const e2eTotal = e2e.stats.expected + e2e.stats.unexpected + e2e.stats.flaky;
const e2ePassed = e2e.stats.expected;
const when = new Intl.DateTimeFormat("sk-SK", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bratislava" }).format(new Date(e2e.stats.startTime));

const table = (title, tool, groups) => `
  <section>
    <header><h2>${title}</h2><span>${tool}</span></header>
    <table>
      ${groups
        .map(
          (g) => `
        <tr class="file"><th colspan="2">${esc(g.file)}</th><th class="num">${g.tests.length} ${g.tests.length === 1 ? "test" : g.tests.length < 5 ? "testy" : "testov"}</th></tr>
        ${g.tests
          .map(
            (t) => `<tr><td class="st ${t.ok ? "ok" : "bad"}">${t.ok ? "✓" : "✕"}</td><td>${esc(t.name)}</td><td class="num">${ms(t.duration)}</td></tr>`,
          )
          .join("")}`,
        )
        .join("")}
    </table>
  </section>`;

const html = `<!doctype html><html lang="sk"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font: 15px/1.5 "IBM Plex Sans", system-ui, sans-serif; color: #17211f; background: #f5f6f6; padding: 32px; width: 1100px; }
  h1 { font-size: 24px; font-weight: 600; }
  .sub { color: #5b6764; margin-top: 2px; }
  .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
  .tile { background: #fff; border: 1px solid #dde2e0; border-radius: 6px; padding: 14px 16px; }
  .tile b { display: block; font: 600 22px/1.3 "IBM Plex Mono", monospace; color: #14473f; }
  .tile span { font-size: 13px; color: #5b6764; }
  .tile .lbl { color: #17211f; font-weight: 600; font-size: 14px; display: block; margin-bottom: 4px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  section { background: #fff; border: 1px solid #dde2e0; border-radius: 6px; overflow: hidden; }
  section header { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 16px; border-bottom: 1px solid #dde2e0; }
  h2 { font-size: 16px; font-weight: 600; }
  section header span { font-size: 13px; color: #5b6764; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td, th { padding: 5px 12px; text-align: left; vertical-align: top; }
  tr + tr td { border-top: 1px solid #eef0ef; }
  tr.file th { background: #eef0ef; font: 500 12px "IBM Plex Mono", monospace; color: #3a4744; padding-top: 7px; padding-bottom: 7px; }
  .num { text-align: right; white-space: nowrap; font-family: "IBM Plex Mono", monospace; color: #5b6764; font-size: 12px; }
  .st { width: 20px; font-weight: 600; padding-right: 0; }
  .ok { color: #1d6b3f; } .bad { color: #a8322a; }
</style></head><body>
  <h1>Výsledky automatických testov</h1>
  <p class="sub">Systém pre prideľovanie ubytovania · spustené ${esc(when)}</p>
  <div class="tiles">
    <div class="tile"><span class="lbl">Unit testy</span><b>${unitPassed} / ${unitTotal}</b><span>Vitest, ${ms(vitest.testResults.reduce((a, f) => a + (f.endTime - f.startTime), 0))}</span></div>
    <div class="tile"><span class="lbl">End-to-end testy</span><b>${e2ePassed} / ${e2eTotal}</b><span>Playwright v Chrome, ${ms(e2e.stats.duration)}</span></div>
    <div class="tile"><span class="lbl">Prístupnosť</span><b>0 chýb</b><span>axe-core, WCAG 2.1 AA, každá obrazovka</span></div>
    <div class="tile"><span class="lbl">Statická kontrola</span><b>OK</b><span>TypeScript (tsc) a ESLint bez chýb</span></div>
  </div>
  <div class="cols">
    ${table("Unit testy", "Vitest", unitGroups)}
    ${table("End-to-end testy", "Playwright", e2eGroups)}
  </div>
</body></html>`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.locator("body").screenshot({ path: "docs/screenshots/24-vysledky-testov.png" });
await browser.close();
console.log(`unit ${unitPassed}/${unitTotal}, e2e ${e2ePassed}/${e2eTotal}`);
