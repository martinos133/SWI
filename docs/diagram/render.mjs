// Vykreslí ER diagram (Mermaid) do PNG pre kapitolu 5 dokumentu.
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const source = await readFile(new URL("./er.mmd", import.meta.url), "utf8");
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff">
<pre class="mermaid">${source}</pre>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";
  mermaid.initialize({ startOnLoad: false, theme: "base", themeVariables: {
    primaryColor: "#f5ecd6", primaryBorderColor: "#0f2e2a", lineColor: "#0f2e2a",
    primaryTextColor: "#0f2e2a", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "15px" },
    er: { layoutDirection: "TB" } });
  await mermaid.run();
  document.body.dataset.done = "1";
</script></body></html>`);
await page.waitForSelector("body[data-done='1']", { timeout: 30000 });
await page.locator("pre.mermaid svg").screenshot({ path: new URL("../screenshots/00-datovy-model.png", import.meta.url).pathname });
await browser.close();
console.log("ok");
