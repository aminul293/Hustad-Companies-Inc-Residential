const { chromium } = require("/opt/homebrew/lib/node_modules/playwright");
const path = require("path");
const OUT = path.join(__dirname, "../public/screenshots");

async function pause(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("http://localhost:3000/guide", { waitUntil: "networkidle" });
  await pause(1200);

  // screenshot each of the 8 steps by clicking the dot nav
  const dots = page.locator(".AppWalkthrough button[class*='rounded-full'][class*='h-1'], div[class*='h-1'][class*='rounded-full']");

  // Just screenshot each step using the next button
  const nextBtn = page.locator("button").filter({ has: page.locator("svg") }).nth(2); // chevron right

  for (let i = 1; i <= 8; i++) {
    await pause(500);
    await page.screenshot({
      path: `${OUT}/WALK-step${i}.png`,
      clip: { x: 0, y: 90, width: 820, height: 620 },
    });
    console.log(`✓ step ${i}`);
    if (i < 8) await nextBtn.click();
    await pause(400);
  }

  await browser.close();
  console.log("✅ Done.");
})();
