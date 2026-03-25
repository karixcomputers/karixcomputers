import axios from "axios";
import * as cheerio from "cheerio";

// ID-ul wishlist-ului tău de test
const WISHLIST_ID = "6151169"; 

async function testScraper() {
  console.log(`🚀 Pornire test pentru Wishlist: ${WISHLIST_ID}...`);
  
  try {
    const url = `https://www.pcgarage.ro/vizualizare-wishlist/${WISHLIST_ID}/`;
    
    // Luăm HTML-ul (cu User-Agent ca să părem un browser real)
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    const $ = cheerio.load(data);
    
    // Selectorul pentru prețul total de pe PC Garage
    // Căutăm textul care conține "Total" sau clasa price_format
    let priceRaw = $(".price_format").first().text();

    if (!priceRaw) {
      console.log("❌ Nu am putut găsi prețul. S-ar putea ca selectorul să se fi schimbat sau suntem blocați.");
      return;
    }

    console.log(`🔎 Preț brut găsit: ${priceRaw}`);

    // CURĂȚARE: Scoatem punctele (pentru mii) și textul "RON", lăsăm doar cifrele
    const cleanPrice = parseInt(priceRaw.replace(/\./g, "").replace(/[^0-9]/g, ""));
    
    // CALCULE KARIX
    const manopera = 200;
    const adaosPercent = 1.10; // 10%
    
    // Formula LaTeX: $$ \text{Pret Final} = (\text{Pret Brut} \times 1.10) + 200 $$
    let calculated = (cleanPrice * adaosPercent) + manopera;
    
    // Rotunjire la "99" (ex: 4532 -> 4540 -> 4539)
    let finalPrice = Math.ceil(calculated / 10) * 10 - 1;

    console.log("--------------------------------------");
    console.log(`✅ SUCCES!`);
    console.log(`💰 Preț PC Garage: ${cleanPrice} RON`);
    console.log(`🛠️ Manoperă: ${manopera} RON`);
    console.log(`📈 Adaos 10%: +${(cleanPrice * 0.10).toFixed(0)} RON`);
    console.log(`💎 PREȚ FINAL KARIX: ${finalPrice} RON`);
    console.log("--------------------------------------");

  } catch (error) {
    if (error.response?.status === 403) {
      console.error("❌ EROARE: PC Garage ne-a blocat accesul (403 Forbidden).");
    } else {
      console.error("❌ EROARE SCRAPER:", error.message);
    }
  }
}

testScraper();