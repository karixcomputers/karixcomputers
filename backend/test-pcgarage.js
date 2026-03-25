import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const WISHLIST_ID = "6151169"; 

async function testScraper() {
  console.log(`🕵️ Încercare disperată (Human Simulation) pentru: ${WISHLIST_ID}...`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--lang=ro-RO,ro'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log("🌐 Navigăm...");
    await page.goto(`https://www.pcgarage.ro/vizualizare-wishlist/${WISHLIST_ID}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Simulăm comportament uman: mișcăm mouse-ul și dăm scroll
    console.log("🖱️ Simulăm activitate umană...");
    await page.mouse.move(100, 100);
    await new Promise(r => setTimeout(r, 1000));
    await page.mouse.move(200, 300);
    await page.evaluate(() => window.scrollBy(0, 500));
    
    // Așteptăm 10 secunde - uneori Cloudflare are nevoie de timp să se "convingă"
    console.log("⏳ Așteptare 10s pentru validare Cloudflare...");
    await new Promise(r => setTimeout(r, 10000));

    // Încercăm să extragem prețul prin mai multe metode
    const data = await page.evaluate(() => {
      const selectors = ['.price_format', '#wishlist_total', '.total-price'];
      for (let s of selectors) {
        let el = document.querySelector(s);
        if (el && el.innerText) return el.innerText;
      }
      // Ultima șansă: căutăm textul brut în pagină
      return document.body.innerText.match(/Total:\s*([\d\.,\s]+)RON/i)?.[0] || null;
    });

    if (!data) {
      console.log("❌ Eșec total. IP-ul serverului este blocat.");
      await page.screenshot({ path: 'ULTIMUL_ESEC.png' });
    } else {
      console.log(`✅ REUȘITĂ! Date brute: ${data}`);
      // ... calculul tău aici
    }

  } catch (e) {
    console.log("❌ Eroare: " + e.message);
  } finally {
    await browser.close();
  }
}
testScraper();