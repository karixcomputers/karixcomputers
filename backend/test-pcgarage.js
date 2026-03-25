import puppeteer from 'puppeteer';

const WISHLIST_ID = "6151169"; 

async function testScraper() {
  console.log(`🚀 Pornire test cu BROWSER real pentru Wishlist: ${WISHLIST_ID}...`);
  
  // Lansăm browserul în mod "headless" (fără interfață grafică)
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Necesar pentru rulare pe VPS/Linux
  });

  try {
    const page = await browser.newPage();
    
    // Setăm un User-Agent de om, nu de robot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log("🌐 Navigăm către PC Garage...");
    await page.goto(`https://www.pcgarage.ro/vizualizare-wishlist/${WISHLIST_ID}/`, {
      waitUntil: 'networkidle2', // Așteptăm să se încarce toate scripturile
      timeout: 60000
    });

    // Luăm prețul folosind selectorul de clasa
    const priceRaw = await page.evaluate(() => {
      const el = document.querySelector('.price_format');
      return el ? el.innerText : null;
    });

    if (!priceRaw) {
      console.log("❌ Nu am găsit prețul. S-ar putea ca pagina să arate diferit.");
      // Facem un screenshot ca să vedem ce vede "robotul" (opțional)
      await page.screenshot({ path: 'error_screenshot.png' });
      console.log("📸 Am salvat error_screenshot.png pentru investigații.");
    } else {
      console.log(`🔎 Preț brut găsit: ${priceRaw}`);

      const cleanPrice = parseInt(priceRaw.replace(/\./g, "").replace(/[^0-9]/g, ""));
      const manopera = 200;
      const adaosPercent = 1.10;
      
      let calculated = (cleanPrice * adaosPercent) + manopera;
      let finalPrice = Math.ceil(calculated / 10) * 10 - 1;

      console.log("--------------------------------------");
      console.log(`✅ SUCCES PRIN BROWSER!`);
      console.log(`💰 Pret PC Garage: ${cleanPrice} RON`);
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