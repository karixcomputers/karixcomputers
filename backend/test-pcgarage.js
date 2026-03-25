import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Activăm modul "invizibil"
puppeteer.use(StealthPlugin());

const WISHLIST_ID = "6151169"; 

async function testScraper() {
  console.log(`🕵️ Pornire test în mod STEALTH pentru Wishlist: ${WISHLIST_ID}...`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--window-size=1920,1080'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Setăm o rezoluție și un limbaj de om
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    console.log("🌐 Navigăm către PC Garage (Stealth Mode)...");
    await page.goto(`https://www.pcgarage.ro/vizualizare-wishlist/${WISHLIST_ID}/`, {
      waitUntil: 'networkidle2', 
      timeout: 60000
    });

    // Așteptăm puțin mai mult, să fim siguri că s-au calculat prețurile
    console.log("⏳ Așteptăm încărcarea datelor...");
    await new Promise(r => setTimeout(r, 5000));

    // Încercăm să luăm prețul cu un selector mai precis
    const priceRaw = await page.evaluate(() => {
      // Căutăm textul care conține "Total" sau clasa de preț
      // PC Garage folosește deseori clase care încep cu 'price'
      const priceElement = document.querySelector('.price_format');
      if (priceElement) return priceElement.innerText;
      
      // Dacă nu găsește clasa, caută în tot tabelul de total
      const allText = document.body.innerText;
      const match = allText.match(/Total:\s*([\d\.,]+)\s*RON/i);
      return match ? match[1] : null;
    });

    if (!priceRaw) {
      console.log("❌ Nici Stealth nu a găsit prețul direct.");
      await page.screenshot({ path: 'stealth_failed.png' });
      console.log("📸 Verifică stealth_failed.png. Dacă vezi un cerc care se învârte sau un checkbox, suntem la nivelul de captcha.");
    } else {
      console.log(`🔎 Preț găsit: ${priceRaw}`);

      const cleanPrice = parseInt(priceRaw.replace(/\./g, "").replace(/[^0-9]/g, ""));
      const manopera = 200;
      const adaosPercent = 1.10;
      let finalPrice = Math.ceil((cleanPrice * adaosPercent) + manopera / 10) * 10 - 1;

      console.log("--------------------------------------");
      console.log(`✅ SUCCES STEALTH!`);
      console.log(`💰 Pret Brut: ${cleanPrice} RON`);
      console.log(`💎 PRET FINAL KARIX: ${finalPrice} RON`);
      console.log("--------------------------------------");
    }

  } catch (error) {
    console.error("❌ EROARE:", error.message);
  } finally {
    await browser.close();
    console.log("👋 Browser închis.");
  }
}

testScraper();