const { chromium } = require("/opt/homebrew/lib/node_modules/playwright");
const path = require("path");
const fs   = require("fs");

const VIDEO_DIR = path.join(__dirname, "../public/videos");
const OUT_WEBM  = path.join(VIDEO_DIR, "guide-walkthrough-raw.webm");

if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

async function pause(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Draw a smooth animated cursor overlay via JS injected into the page
async function moveTo(page, x, y) {
  await page.evaluate(({ x, y }) => {
    let c = document.getElementById("__demo-cursor");
    if (!c) {
      c = document.createElement("div");
      c.id = "__demo-cursor";
      c.style.cssText = `
        position:fixed; z-index:99999; pointer-events:none;
        width:22px; height:22px; border-radius:50%;
        background:rgba(255,255,255,0.9);
        border:2px solid rgba(74,143,212,0.9);
        box-shadow:0 2px 12px rgba(0,0,0,0.4);
        transform:translate(-50%,-50%);
        transition:left 0.35s cubic-bezier(.4,0,.2,1), top 0.35s cubic-bezier(.4,0,.2,1);
      `;
      document.body.appendChild(c);
    }
    c.style.left = x + "px";
    c.style.top  = y + "px";
  }, { x, y });
  await pause(360);
}

async function click(page, x, y) {
  await moveTo(page, x, y);
  // pulse on click
  await page.evaluate(({ x, y }) => {
    const c = document.getElementById("__demo-cursor");
    if (c) { c.style.transform = "translate(-50%,-50%) scale(0.7)"; }
  }, { x, y });
  await page.mouse.click(x, y);
  await pause(120);
  await page.evaluate(() => {
    const c = document.getElementById("__demo-cursor");
    if (c) c.style.transform = "translate(-50%,-50%) scale(1)";
  });
  await pause(300);
}

async function scrollTo(page, top) {
  await page.evaluate(t => {
    const el = document.querySelector(".h-screen.overflow-y-auto");
    if (el) el.scrollTo({ top: t, behavior: "smooth" });
  }, top);
  await pause(700);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 820, height: 1180 } },
  });
  const page = await context.newPage();

  await page.goto("http://localhost:3000/guide", { waitUntil: "networkidle" });
  await pause(1000);

  // ── ACT 1: Show the header and tabs ────────────────────────────────────────
  await moveTo(page, 410, 100);
  await pause(600);

  // hover over "For Managers" tab
  await moveTo(page, 553, 90);
  await pause(500);
  await click(page, 553, 90);       // switch to Managers tab
  await pause(800);

  // hover back to "For Field Reps"
  await moveTo(page, 432, 90);
  await pause(400);
  await click(page, 432, 90);       // switch back
  await pause(800);

  // ── ACT 2: Scroll through Workflow — hover + click a thumbnail ─────────────
  await scrollTo(page, 200);
  await moveTo(page, 463, 400);     // hover over A01 thumbnail
  await pause(500);
  await click(page, 463, 400);      // open lightbox
  await pause(900);

  // close lightbox with X
  await click(page, 302, 135);
  await pause(600);

  // hover A03 thumbnail and open
  await moveTo(page, 463, 555);
  await pause(400);
  await click(page, 463, 555);
  await pause(800);
  // close by clicking backdrop
  await click(page, 100, 100);
  await pause(500);

  // ── ACT 3: Scroll to Shot List, expand two sections ───────────────────────
  await scrollTo(page, 2100);
  await pause(400);

  // click General Exterior accordion
  const extBtn = page.locator("text=General Exterior").first();
  const extBox = await extBtn.boundingBox();
  if (extBox) {
    await moveTo(page, extBox.x + extBox.width / 2, extBox.y + extBox.height / 2);
    await pause(400);
    await click(page, extBox.x + extBox.width / 2, extBox.y + extBox.height / 2);
  }
  await pause(600);
  await scrollTo(page, 2500);

  // click General Roof accordion
  const roofBtn = page.locator("text=General Roof").first();
  const roofBox = await roofBtn.boundingBox();
  if (roofBox) {
    await moveTo(page, roofBox.x + roofBox.width / 2, roofBox.y + roofBox.height / 2);
    await pause(400);
    await click(page, roofBox.x + roofBox.width / 2, roofBox.y + roofBox.height / 2);
  }
  await pause(600);

  // ── ACT 4: Scroll to Sync Status ─────────────────────────────────────────
  await scrollTo(page, 4600);
  await pause(600);
  await moveTo(page, 410, 500);
  await pause(500);

  // ── ACT 5: Scroll to Pipeline Stage Reference ─────────────────────────────
  await scrollTo(page, 5500);
  await pause(700);
  await moveTo(page, 410, 500);
  await pause(600);

  // ── ACT 6: Troubleshooting — open first item ──────────────────────────────
  await scrollTo(page, 7300);
  await pause(500);
  const tBtn = page.locator("text=I can't log in").first();
  const tBox = await tBtn.boundingBox();
  if (tBox) {
    await moveTo(page, tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
    await pause(400);
    await click(page, tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
  }
  await pause(700);

  // ── ACT 7: Switch to Managers tab ─────────────────────────────────────────
  await scrollTo(page, 0);
  await pause(500);
  await moveTo(page, 553, 90);
  await pause(400);
  await click(page, 553, 90);
  await pause(800);
  await scrollTo(page, 400);
  await pause(500);
  await scrollTo(page, 1400);
  await pause(700);

  // final pause before end
  await pause(800);

  await context.close();
  await browser.close();

  // find the generated webm (Playwright names it randomly)
  const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith(".webm") && f !== "guide-walkthrough-raw.webm");
  if (files.length) {
    fs.renameSync(path.join(VIDEO_DIR, files[0]), OUT_WEBM);
    console.log("✅ Raw video saved:", OUT_WEBM);
  } else {
    console.log("⚠️  No webm found in", VIDEO_DIR);
  }
})();
