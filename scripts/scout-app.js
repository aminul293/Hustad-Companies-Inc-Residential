const { chromium } = require("/opt/homebrew/lib/node_modules/playwright");
const path = require("path");
const OUT = path.join(__dirname, "../public/screenshots");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 820, height: 1180 });

  // Land on app with QA mock rep
  await page.goto("http://localhost:3000/rep?repId=rep_001", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/SCOUT-01-landing.png` });
  console.log("✓ landing");

  // Click New Leads tab
  const newLeadsBtn = page.locator("text=New Leads").first();
  if (await newLeadsBtn.count()) {
    await newLeadsBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/SCOUT-02-new-leads.png` });
    console.log("✓ new leads tab");
  }

  // Click Pipeline tab
  const pipelineBtn = page.locator("text=Pipeline").first();
  if (await pipelineBtn.count()) {
    await pipelineBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/SCOUT-03-pipeline.png` });
    console.log("✓ pipeline tab");
  }

  await browser.close();
  console.log("✅ Scout done.");
})();
