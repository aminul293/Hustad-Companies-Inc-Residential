const { chromium } = require("/opt/homebrew/lib/node_modules/playwright");
const path = require("path");
const OUT = path.join(__dirname, "../public/screenshots");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("http://localhost:3000/guide", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // screenshot normal state
  await page.screenshot({ path: `${OUT}/LIGHTBOX-01-normal.png` });
  console.log("✓ normal state");

  // click the A01 Welcome thumbnail (first img button)
  await page.locator("button[title='Click to enlarge']").first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/LIGHTBOX-02-open.png` });
  console.log("✓ lightbox open");

  // close with X button
  await page.locator("button").filter({ hasText: "" }).last().click();
  await page.waitForTimeout(300);

  // click A03 thumbnail (3rd one)
  await page.locator("button[title='Click to enlarge']").nth(3).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/LIGHTBOX-03-a03.png` });
  console.log("✓ lightbox A03");

  await browser.close();
  console.log("✅ Done.");
})();
