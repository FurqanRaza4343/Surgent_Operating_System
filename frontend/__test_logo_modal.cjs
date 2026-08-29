const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(`CONSOLE: ${msg.text()}`); });

  const shots = "C:\\Users\\MUHAMM~1\\AppData\\Local\\Temp\\claude\\d--aceone-project-plastic-surgeoun3-0\\09261495-21d2-4a94-a6f3-3008d48b0d8e\\scratchpad";

  // 1. Marketing homepage — Navbar + Footer logo
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}\\logo_1_navbar.png`, clip: { x: 0, y: 0, width: 500, height: 100 } });
  const navImgCount = await page.$$eval('img[alt="Aiaceone"]', els => els.length);
  console.log("Navbar/Footer logo <img> count on homepage:", navImgCount);

  // 2. Sign-in page (auth layout)
  await page.goto("http://localhost:5173/sign-in", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}\\logo_2_signin.png`, fullPage: true });

  // 3. Dashboard sidebar
  await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}\\logo_3_dashboard.png`, fullPage: true });
  const sidebarLogo = await page.$$eval('img[alt="Aiaceone"]', els => els.length);
  console.log("Dashboard logo <img> count:", sidebarLogo);

  // 4. Click "Open AI Command Center" — should open MODAL, not navigate
  const urlBefore = page.url();
  const ccBtn = await page.$('button:has-text("Open AI Command Center")');
  console.log("Command Center is now a BUTTON (not a Link):", !!ccBtn);
  if (ccBtn) {
    await ccBtn.click();
    await page.waitForTimeout(600);
    console.log("URL unchanged after click (stayed on same page):", page.url() === urlBefore);
    await page.screenshot({ path: `${shots}\\logo_4_cc_modal.png`, fullPage: true });
    const modalText = await page.textContent("body");
    console.log("Modal shows 'AI Command Center':", modalText.includes("AI Command Center"));
    console.log("Modal shows 'New chat':", modalText.includes("New chat"));
    console.log("Modal shows sessions empty state:", modalText.includes("No past sessions yet"));

    // Close modal via Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const stillOpen = await page.$('button:has-text("New chat")');
    console.log("Modal closed via Escape:", !stillOpen);
  }

  console.log("\n--- Console/Page errors ---");
  console.log(errors.length ? errors.join("\n") : "none");

  await browser.close();
})();
