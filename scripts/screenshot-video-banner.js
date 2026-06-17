const { chromium } = require("/opt/homebrew/lib/node_modules/playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("http://localhost:3000/guide", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(__dirname, "../public/screenshots/FINAL-video-banner.png"),
  });
  await browser.close();
  console.log("✅ Done.");
})();
