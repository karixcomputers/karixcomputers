import puppeteer from 'puppeteer';

const WISHLIST_ID = "6151169"; 

async function testScraper() {
  console.log(`🚀 Pornire test avansat pentru Wishlist: ${WISHLIST_ID}...`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  try {
    const page = await browser.newPage();
    
    // Ne dăm drept un browser foarte comun
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    console.log("🌐 Navigăm către PC Garage...");
    await page.goto(`https://www.pcgarage.ro/vizualizare-wishlist/${WISHLIST_ID}/`, {
      waitUntil: 'networkidle0', 
      timeout: 60000
    });

    // Așteptăm 3 secunde extra să fim siguri că s-au încărcat prețurile dinamice
    console.log("⏳ Așteptăm încărcarea prețurilor...");
    await new Promise(r => setTimeout(r, 3000));

    // Încercăm să găsim prețul în mai multe locuri
    const priceRaw = await page.evaluate(() => {
      // Selectori posibili pentru prețul total
      const selectors = [
        '.price_format', 
        '#wishlist_total', 
        '.total_price',
        '.cart-total .price'
      ];
      
      for (let s of selectors) {
        const el = document.querySelector(s);
        if (el && el.innerText.trim().length > 0) return el.innerText;
      }
      return null;
    });

    if (!priceRaw) {
      console.log("❌ Tot nu am găsit prețul.");
      // Salvăm un screenshot ca să vezi EXACT ce a văzut robotul (poți descărca fișierul din VPS să-l vezi)
      await page.screenshot({ path: 'debug_pcgarage.png' });
      console.log("📸 Am salvat debug_pcgarage.png. Verifică-l să vezi dacă apare Cloudflare.");
    } else {
      console.log(`🔎 Preț brut găsit în pagină: ${priceRaw}`);

      // Curățăm textul: eliminăm tot ce nu e cifră
      const cleanPrice = parseInt(priceRaw.replace(/\./g, "").replace(/[^0-9]/g, ""));
      
      if (isNaN(cleanPrice)) {
          console.log("❌ Prețul găsit nu este un număr valid.");
          return;
      }

      const manopera = 200;
      const adaosPercent = 1.10;
      let calculated = (cleanPrice * adaosPercent) + manopera;
      let finalPrice = Math.ceil(calculated / 10) * 10 - 1;

      console.log("--------------------------------------");
      console.log(`✅ SUCCES!`);
      console.log(`💰 Pret Wishlist: ${cleanPrice} RON`);
      console.log(`🛠️ Manopera: ${manopera} RON`);
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