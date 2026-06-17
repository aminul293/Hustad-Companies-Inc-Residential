const { chromium } = require("/opt/homebrew/lib/node_modules/playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto("http://localhost:3000/preview-with-screenshots.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(__dirname, "../public/screenshots/PREVIEW-with-screenshots.png"),
    fullPage: true,
  });
  await browser.close();
  console.log("✅ Preview saved.");
})();
