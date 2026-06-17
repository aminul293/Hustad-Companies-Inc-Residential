const { chromium } = require("/opt/homebrew/lib/node_modules/playwright");
const path = require("path");
const OUT = path.join(__dirname, "../public/screenshots");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("http://localhost:3000/guide", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // top of workflow section
  await page.screenshot({ path: `${OUT}/UPDATED-01-workflow-top.png` });
  console.log("✓ top");

  // scroll to show Phase B steps
  await page.evaluate(() => document.querySelector(".h-screen.overflow-y-auto").scrollTop = 700);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/UPDATED-02-workflow-bottom.png` });
  console.log("✓ bottom");

  await browser.close();
  console.log("✅ Done.");
})();
