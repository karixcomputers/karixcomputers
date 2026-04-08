import fetch from "node-fetch";

// Cache pentru token-ul principal
let currentToken = null;
let tokenExpiration = null;

// Cache pentru token-ul ocazional (RETUR)
let currentReturnToken = null;
let returnTokenExpiration = null;

// ==========================================
// 1. AUTENTIFICARE ȘI OBȚINERE TOKEN PRINCIPAL
// ==========================================
export async function getFanToken() {
    if (currentToken && tokenExpiration && new Date() < tokenExpiration) return currentToken;

    const username = process.env.FAN_USERNAME;
    const password = process.env.FAN_PASSWORD;

    if (!username || !password) throw new Error("❌ Lipsesc credențialele FAN Courier din .env!");

    try {
        const url = `https://api.fancourier.ro/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        
        const extractedToken = data?.data?.token || data?.token;
        if (extractedToken) {
            currentToken = extractedToken;
            tokenExpiration = new Date(new Date().getTime() + 23 * 60 * 60 * 1000);
            return currentToken;
        } else throw new Error(data.message || "Eroare token");
    } catch (error) {
        console.error("❌ Eroare FAN Courier Auth:", error.message);
        throw error;
    }
}

// ==========================================
// 1.5. AUTENTIFICARE PENTRU CONT OCAZIONAL (RETUR)
// ==========================================
export async function getFanReturnToken() {
    if (currentReturnToken && returnTokenExpiration && new Date() < returnTokenExpiration) return currentReturnToken;

    const username = process.env.FAN_RETURN_USERNAME || process.env.FAN_USERNAME;
    const password = process.env.FAN_RETURN_PASSWORD || process.env.FAN_PASSWORD;

    try {
        const url = `https://api.fancourier.ro/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        
        const extractedToken = data?.data?.token || data?.token;
        if (extractedToken) {
            currentReturnToken = extractedToken;
            returnTokenExpiration = new Date(new Date().getTime() + 23 * 60 * 60 * 1000);
            return currentReturnToken;
        } else throw new Error(data.message || "Eroare token retur");
    } catch (error) {
        console.error("❌ Eroare FAN Courier Auth Retur:", error.message);
        throw error;
    }
}

const formatForFan = (str) => {
    if (!str) return "";
    let cleanStr = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let formatted = cleanStr.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const noSpaces = formatted.replace(/\s+/g, '');
    if (noSpaces === "ClujNapoca") return "Cluj-Napoca";
    if (noSpaces === "BistritaNasaud") return "Bistrita-Nasaud";
    if (noSpaces === "CarasSeverin") return "Caras-Severin";
    if (noSpaces.includes("Bucuresti") || noSpaces.includes("Sector")) return "Bucuresti";
    return formatted;
};

// ==========================================
// MOTOR INTELIGENT DE EXTRAGERE A ADRESELOR (GĂSEȘTE JUDEȚUL ORIUNDE AR FI)
// ==========================================
const roCounties = ["alba", "arad", "arges", "bacau", "bihor", "bistrita-nasaud", "botosani", "braila", "brasov", "bucuresti", "buzau", "calarasi", "caras-severin", "cluj", "constanta", "covasna", "dambovita", "dolj", "galati", "giurgiu", "gorj", "harghita", "hunedoara", "ialomita", "iasi", "ilfov", "maramures", "mehedinti", "mures", "neamt", "olt", "prahova", "salaj", "satu mare", "sibiu", "suceava", "teleorman", "timis", "tulcea", "valcea", "vaslui", "vrancea"];

function extractIntelligently(str) {
    if (!str) return null;
    let clean = str.replace(/,\s*rom[aâ]nia$/i, '').trim();
    if (clean.includes("| Note:")) clean = clean.split("| Note:")[0].trim();
    clean = clean.replace(/Locker FANbox:/i, '').replace(/FANbox.*?-/i, '').trim();

    const parts = clean.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return null;

    let c = "", l = "", s = [];
    let cIndex = -1;
    
    // Căutăm județul în segmentele de text
    for (let i = 0; i < parts.length; i++) {
        let normalizedPart = parts[i].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, '');
        if (normalizedPart === 'bistritanasaud') normalizedPart = 'bistrita-nasaud';
        if (normalizedPart === 'carasseverin') normalizedPart = 'caras-severin';
        if (normalizedPart === 'satumare') normalizedPart = 'satu mare';
        
        if (roCounties.includes(normalizedPart) || normalizedPart.includes('bucuresti') || normalizedPart.includes('sector')) {
            cIndex = i;
            c = normalizedPart.includes('bucuresti') || normalizedPart.includes('sector') ? "Bucuresti" : parts[i];
            break;
        }
    }

    if (cIndex !== -1) {
        // Dacă a găsit județul la final (Stradă, Oraș, Județ)
        if (cIndex > 0 && cIndex === parts.length - 1) {
            l = parts[cIndex - 1];
            s = parts.slice(0, cIndex - 1);
        } 
        // Dacă a găsit județul la început (Județ, Oraș, Stradă - format Widget FANbox)
        else if (cIndex < parts.length - 1) {
            l = parts[cIndex + 1];
            s = parts.filter((_, idx) => idx !== cIndex && idx !== (cIndex + 1));
        } else {
            l = parts[0];
            s = parts;
        }
    } else {
        // Fallback dacă scrie ceva total necunoscut
        if (parts.length >= 3) {
            c = parts[parts.length - 1];
            l = parts[parts.length - 2];
            s = parts.slice(0, parts.length - 2);
        } else if (parts.length === 2) {
            c = parts[1];
            l = parts[0];
            s = [parts[0]];
        } else {
            c = "Bucuresti"; l = "Bucuresti"; s = parts;
        }
    }

    return { c, l, s: s.join(', ') };
}

function parseAddresses(rawAddress, providedPudoId) {
    let homeStr = rawAddress;
    let lockerStr = "";
    let finalPudoId = providedPudoId;

    if (rawAddress.includes("| Locker:")) {
        const parts = rawAddress.split("| Locker:");
        homeStr = parts[0].trim();
        lockerStr = parts[1].trim();
    } else if (rawAddress.toLowerCase().includes("fanbox") || rawAddress.includes("Locker FANbox:")) {
        lockerStr = rawAddress;
        homeStr = rawAddress; 
    }

    if (!finalPudoId && lockerStr) {
        const match = lockerStr.match(/F\d{5,}/);
        if (match) finalPudoId = match[0];
    }

    let extHome = extractIntelligently(homeStr);
    let extLocker = extractIntelligently(lockerStr);

    let county = extHome?.c || "Bucuresti";
    let locality = extHome?.l || "Bucuresti";
    let street = extHome?.s || homeStr;

    const isInvalid = (val) => !val || val.toLowerCase().includes("fanbox") || val.toLowerCase().includes("locker");

    if (isInvalid(county) && extLocker && extLocker.c && !isInvalid(extLocker.c)) {
        county = extLocker.c;
        locality = extLocker.l;
        street = extLocker.s;
    }

    return {
        pudoId: finalPudoId,
        county: formatForFan(county),
        locality: formatForFan(locality),
        street: street || "Livrare FANbox"
    };
}

// ==========================================
// 2. GENERARE AWB STANDARD (Karix -> Client)
// ==========================================
// 👉 NOU: Am adăugat customDeclaredValue ca ultim parametru
export async function createFanAWB(order, isTestMode = false, weight = 1, packagesCount = 1, isInsured = false, forceFanbox = false, customDeclaredValue = null) { 
    if (isTestMode) return `TEST_AWB_${Math.floor(Math.random() * 100000000)}`; 

    try {
        const token = await getFanToken();
        const clientIdNum = parseInt(String(process.env.FAN_CLIENT_ID).trim(), 10);

        const rawAddress = order.shippingAddress || "";
        const parsedData = parseAddresses(rawAddress, order.fanboxLocationId);
        
        const hasHomeAndLockerSeparately = rawAddress.includes("| Locker:");
        const isDeliveryToLocker = forceFanbox || (!hasHomeAndLockerSeparately && Boolean(parsedData.pudoId));

        const orderTotalRon = (order.totalCents / 100);
        const rambursValue = (order.paymentMethod === 'online' || order.paymentMethod === 'transfer_bancar') ? 0 : orderTotalRon;
        const serviceType = rambursValue > 0 ? "Cont Colector" : "Standard";

        // 👉 NOU: Logica de stabilire a valorii declarate (pentru asigurare)
        let finalDeclaredValue = 0;
        if (isInsured) {
            // Dacă din Admin ți-a venit o valoare specifică (ex: 20000 lei pentru piesele de Asamblare)
            if (customDeclaredValue !== null && !isNaN(customDeclaredValue)) {
                finalDeclaredValue = Number(customDeclaredValue);
            } else {
                // Dacă nu, folosește valoarea coșului (cum era înainte)
                finalDeclaredValue = orderTotalRon;
            }
        }

        const payload = {
            clientId: clientIdNum,
            shipments: [
                {
                    info: {
                        service: serviceType, 
                        packages: { parcel: parseInt(packagesCount), envelopes: 0 },
                        weight: parseInt(weight),
                        payment: "sender", 
                        observation: `Comanda Karix #${String(order.id).slice(-8)}`,
                        content: "Sistem PC / Componente Hardware",
                        dimensions: { length: 40, height: 40, width: 20 }, 
                        cod: rambursValue,
                        declaredValue: finalDeclaredValue, // Acum folosește valoarea calculată inteligent mai sus
                        options: [] 
                    },
                    recipient: {
                        name: order.shippingName,
                        phone: order.shippingPhone,
                        email: order.user?.email || "contact@karixcomputers.ro",
                        address: {
                            county: parsedData.county,
                            locality: parsedData.locality,
                            street: isDeliveryToLocker ? "Livrare la locker FANbox" : parsedData.street,
                            streetNo: "-", 
                            zipCode: "",
                            ...(isDeliveryToLocker && parsedData.pudoId && { pudoLocationId: parsedData.pudoId })
                        }
                    }
                }
            ]
        };

        const response = await fetch("https://api.fancourier.ro/intern-awb", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.response && Array.isArray(data.response) && data.response[0].awbNumber) {
             return String(data.response[0].awbNumber); 
        }
        
        const errObj = data?.response?.[0]?.errors || data?.message || data;
        throw new Error(typeof errObj === 'object' ? JSON.stringify(errObj) : String(errObj));

    } catch (error) {
        console.error("❌ Eroare generare AWB Standard:", error.message);
        throw error;
    }
}

// ==========================================
// 3. GENERARE AWB INVERS (Client -> Karix)
// ==========================================
export async function createReverseFanAWB(order, isTestMode = false) { 
    if (isTestMode) return `TEST_REV_AWB_${Math.floor(Math.random() * 100000000)}`; 

    try {
        const token = await getFanReturnToken();
        const clientIdNum = parseInt(String(process.env.FAN_RETURN_CLIENT_ID || process.env.FAN_CLIENT_ID).trim(), 10);

        const rawAddress = order.shippingAddress || "";
        const cleanPhone = order.shippingPhone.replace(/\D/g, "");
        const parsedData = parseAddresses(rawAddress, order.fanboxLocationId);
        
        const isDropOff = Boolean(parsedData.pudoId);
        
        const payload = {
            clientId: clientIdNum,
            shipments: [
                {
                    info: {
                        service: isDropOff ? "FANbox" : "Standard",
                        packages: { parcel: 1, envelopes: 0 },
                        weight: 5,
                        payment: "recipient", 
                        observation: `Retur Service Comanda #${String(order.id).slice(-8)}`,
                        content: "Laptop / Consola (Service)",
                        dimensions: { length: 40, height: 40, width: 20 }, 
                        cod: 0,
                        declaredValue: 0,
                        options: isDropOff ? ["W"] : []
                    },
                    sender: {
                        name: order.shippingName,
                        contactPerson: order.shippingName, 
                        phone: cleanPhone,
                        email: order.user?.email || "contact@karixcomputers.ro",
                        address: {
                            county: parsedData.county,
                            locality: parsedData.locality,
                            street: isDropOff ? "Predare la locker FANbox" : parsedData.street,
                            streetNo: "-", 
                            zipCode: "",
                            ...(isDropOff && parsedData.pudoId && { dropOffLocationId: parsedData.pudoId })
                        }
                    },
                    recipient: {
                        name: "Karix Computers",
                        phone: "0770619935",
                        email: "contact@karixcomputers.ro",
                        address: {
                            county: "Bihor",
                            locality: "Oradea",
                            street: "Str. Sovata, Bl. C6, Ap. 51", 
                            streetNo: "52", 
                            zipCode: "410298" 
                        }
                    }
                }
            ]
        };

        const response = await fetch("https://api.fancourier.ro/intern-awb", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.response && Array.isArray(data.response) && data.response[0].awbNumber) {
             return String(data.response[0].awbNumber); 
        }
        
        const errObj = data?.response?.[0]?.errors || data?.message || data;
        const errString = typeof errObj === 'object' ? JSON.stringify(errObj) : String(errObj);
        throw new Error(errString);

    } catch (error) {
        console.error("❌ Eroare generare REVERSE AWB:", error.message);
        throw error;
    }
}