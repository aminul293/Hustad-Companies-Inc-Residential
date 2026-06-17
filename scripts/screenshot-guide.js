const { chromium } = require("/opt/homebrew/lib/node_modules/playwright");
const path = require("path");

const OUT = path.join(__dirname, "../public/screenshots");
const BASE = "http://localhost:3000/guide";

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log(`  ✓ ${name}.png`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 820, height: 1180 });

  console.log("\n── For Field Reps tab ──────────────────────────");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // 01 — full header + top of reps tab
  await shot(page, "01-reps-header");

  // 02 — scroll to Workflow section
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: "instant" }));
  await shot(page, "02-workflow-map");

  // 03 — scroll to Starting a Session
  await page.evaluate(() => window.scrollTo({ top: 1100, behavior: "instant" }));
  await shot(page, "03-starting-session");

  // 04 — scroll to Shot List, click open each section
  await page.evaluate(() => window.scrollTo({ top: 2100, behavior: "instant" }));
  await shot(page, "04-shot-list-closed");

  // open General Exterior
  await page.locator("text=General Exterior").first().click();
  await page.waitForTimeout(300);
  await shot(page, "05-shot-list-exterior-open");

  // open General Roof
  await page.locator("text=General Roof").first().click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo({ top: 2800, behavior: "instant" }));
  await shot(page, "06-shot-list-roof-open");

  // open Hail and Wind
  await page.locator("text=Hail and Wind").first().click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo({ top: 3600, behavior: "instant" }));
  await shot(page, "07-shot-list-hail-open");

  // 08 — Sync & Status
  await page.evaluate(() => window.scrollTo({ top: 4600, behavior: "instant" }));
  await shot(page, "08-sync-status");

  // 09 — Pipeline Stage Reference
  await page.evaluate(() => window.scrollTo({ top: 5400, behavior: "instant" }));
  await shot(page, "09-pipeline-stages");

  // 10 — Reviewing Submitted Inspections
  await page.evaluate(() => window.scrollTo({ top: 6200, behavior: "instant" }));
  await shot(page, "10-reviewing-inspections");

  // 11 — Troubleshooting, click open first 2 items
  await page.evaluate(() => window.scrollTo({ top: 7200, behavior: "instant" }));
  const troubleItems = page.locator("text=I can't log in"), tItem2 = page.locator("text=Photos are stuck");
  await troubleItems.first().click();
  await page.waitForTimeout(200);
  await tItem2.first().click();
  await page.waitForTimeout(200);
  await shot(page, "11-troubleshooting-open");

  console.log("\n── For Managers tab ────────────────────────────");
  // Switch tab
  await page.locator("text=For Managers").click();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await shot(page, "12-managers-header");

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
  await shot(page, "13-managers-pipeline-stages");

  await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }));
  await shot(page, "14-managers-review-flow");

  await page.evaluate(() => window.scrollTo({ top: 2400, behavior: "instant" }));
  await shot(page, "15-managers-outbound-queue");

  await page.evaluate(() => window.scrollTo({ top: 3200, behavior: "instant" }));
  await shot(page, "16-managers-admin-actions");

  await page.evaluate(() => window.scrollTo({ top: 4000, behavior: "instant" }));
  await shot(page, "17-managers-rep-management");

  await browser.close();
  console.log(`\n✅  All screenshots saved to public/screenshots/\n`);
})();
