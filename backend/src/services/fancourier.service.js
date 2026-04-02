import fetch from "node-fetch";

let currentToken = null;
let tokenExpiration = null;

// ==========================================
// 1. AUTENTIFICARE ȘI OBȚINERE TOKEN
// ==========================================
export async function getFanToken() {
    if (currentToken && tokenExpiration && new Date() < tokenExpiration) {
        return currentToken;
    }

    const username = process.env.FAN_USERNAME;
    const password = process.env.FAN_PASSWORD;

    if (!username || !password) {
        throw new Error("❌ Lipsesc credențialele FAN Courier din .env!");
    }

    try {
        const url = `https://api.fancourier.ro/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        const response = await fetch(url, { method: "POST" });
        const data = await response.json();
        
        console.log("🔍 Răspuns Autentificare FAN:", data);

        const extractedToken = data?.data?.token || data?.token;
        if (extractedToken) {
            currentToken = extractedToken;
            tokenExpiration = new Date(new Date().getTime() + 23 * 60 * 60 * 1000);
            return currentToken;
        } else {
            throw new Error(data.message || "Eroare token");
        }
    } catch (error) {
        console.error("❌ Eroare FAN Courier Auth:", error.message);
        throw error;
    }
}

// ==========================================
// 2. GENERARE AWB STANDARD (Karix -> Client)
// ==========================================
export async function createFanAWB(order, isTestMode = false, weight = 1, packagesCount = 1, isInsured = false) { 
    console.log(`📦 Inițiere generare AWB pentru comanda #${order.id}. Greutate: ${weight}kg, Colete: ${packagesCount}, Asigurat: ${isInsured}`);

    if (isTestMode) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return `TEST_AWB_${Math.floor(Math.random() * 100000000)}`; 
    }

    try {
        const token = await getFanToken();
        const clientIdString = process.env.FAN_CLIENT_ID;

        if (!clientIdString) throw new Error("FAN_CLIENT_ID lipsește din .env");
        
        const clientIdNum = parseInt(String(clientIdString).trim(), 10);

        let rawAddress = order.shippingAddress || "";
        if (rawAddress.includes("| Note:")) {
            rawAddress = rawAddress.split("| Note:")[0].trim();
        }

        const addressParts = rawAddress.split(',').map(s => s.trim()).filter(Boolean);
        
        let county = "Bucuresti";
        let locality = "Bucuresti";
        let street = rawAddress;

        if (addressParts.length >= 3) {
            county = addressParts.pop(); 
            locality = addressParts.pop(); 
            street = addressParts.join(', '); 
        } else if (addressParts.length === 2) {
            county = addressParts[1];
            locality = addressParts[1];
            street = addressParts[0];
        }

        const formatForFan = (str) => {
            let cleanStr = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            let formatted = cleanStr.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            const noSpaces = formatted.replace(/\s+/g, '');
            if (noSpaces === "ClujNapoca") return "Cluj-Napoca";
            if (noSpaces === "BistritaNasaud") return "Bistrita-Nasaud";
            if (noSpaces === "CarasSeverin") return "Caras-Severin";
            if (noSpaces.includes("Bucuresti") || noSpaces.includes("Sector")) return "Bucuresti";
            return formatted;
        };

        locality = formatForFan(locality);
        county = formatForFan(county);

        const orderTotalRon = (order.totalCents / 100);
        const rambursValue = (order.paymentMethod === 'online' || order.paymentMethod === 'transfer_bancar') ? 0 : orderTotalRon;
        const serviceType = rambursValue > 0 ? "Cont Colector" : "Standard";

        const declaredValue = isInsured ? orderTotalRon : 0;

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
                        declaredValue: declaredValue 
                    },
                    recipient: {
                        name: order.shippingName,
                        phone: order.shippingPhone,
                        email: order.user?.email || "contact@karixcomputers.ro",
                        address: {
                            county: county,
                            locality: locality,
                            street: street,
                            streetNo: "-", 
                            zipCode: "" 
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
             const awbGenerated = String(data.response[0].awbNumber); 
             console.log(`✅ AWB GENERAT CU SUCCES: ${awbGenerated} | Asigurat la valoarea: ${declaredValue} RON`);
             return awbGenerated;
        }

        const errorMessage = data?.response?.[0]?.errors || data?.message || JSON.stringify(data);
        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));

    } catch (error) {
        console.error("❌ Eroare auto-generare AWB:", error.message);
        throw error;
    }
}

// ==========================================
// 3. GENERARE AWB INVERS (Client -> Karix)
// ==========================================
export async function createReverseFanAWB(order, isTestMode = false) { 
    // Setăm o greutate standard pentru laptopuri/console (aprox 5kg)
    const weight = 5; 
    const packagesCount = 1;

    console.log(`🔄 Inițiere generare AWB INVERS (Ridicare Service) pentru comanda #${order.id}.`);

    if (isTestMode) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return `TEST_REV_AWB_${Math.floor(Math.random() * 100000000)}`; 
    }

    try {
        const token = await getFanToken();
        const clientIdString = process.env.FAN_CLIENT_ID;

        if (!clientIdString) throw new Error("FAN_CLIENT_ID lipsește din .env");
        const clientIdNum = parseInt(String(clientIdString).trim(), 10);

        // 1. Prelucrăm adresa expeditorului (clientul tău)
        let rawAddress = order.shippingAddress || "";
        if (rawAddress.includes("| Note:")) {
            rawAddress = rawAddress.split("| Note:")[0].trim();
        }

        const addressParts = rawAddress.split(',').map(s => s.trim()).filter(Boolean);
        
        let county = "Bucuresti";
        let locality = "Bucuresti";
        let street = rawAddress;

        if (addressParts.length >= 3) {
            county = addressParts.pop(); 
            locality = addressParts.pop(); 
            street = addressParts.join(', '); 
        } else if (addressParts.length === 2) {
            county = addressParts[1];
            locality = addressParts[1];
            street = addressParts[0];
        }

        const formatForFan = (str) => {
            let cleanStr = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            let formatted = cleanStr.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            const noSpaces = formatted.replace(/\s+/g, '');
            if (noSpaces === "ClujNapoca") return "Cluj-Napoca";
            if (noSpaces === "BistritaNasaud") return "Bistrita-Nasaud";
            if (noSpaces === "CarasSeverin") return "Caras-Severin";
            if (noSpaces.includes("Bucuresti") || noSpaces.includes("Sector") || noSpaces.includes("Fanbox")) return "Bucuresti";
            return formatted;
        };

        locality = formatForFan(locality);
        county = formatForFan(county);

        // 2. Setări specifice pentru Service și Drop-Off (Locker FANbox)
        let serviceType = "Standard";
        let optionsArray = [];
        
        let senderAddress = {
            county: county,
            locality: locality,
            street: street,
            streetNo: "-", 
            zipCode: ""
        };

        // Dacă clientul a selectat predare la FANbox!
        if (order.serviceDeliveryMethod === "fanbox" && order.fanboxLocationId) {
            serviceType = "FANbox"; // Serviciul devine FANbox
            optionsArray = ["W"]; // Litera W înseamnă "DropOff" (clientul îl lasă la locker)
            senderAddress.dropOffLocationId = order.fanboxLocationId;
            senderAddress.street = "Predare Service la FANbox"; // Suprascriem strada
        }

        const payload = {
            clientId: clientIdNum,
            shipments: [
                {
                    info: {
                        service: serviceType,
                        packages: { parcel: packagesCount, envelopes: 0 },
                        weight: weight,
                        payment: "recipient", // 👉 Karix plătește transportul
                        observation: `Retur Service Comanda #${String(order.id).slice(-8)}`,
                        content: "Laptop / Consola (Service)",
                        dimensions: { length: 40, height: 40, width: 20 }, 
                        cod: 0,
                        declaredValue: 0
                    },
                    sender: {
                        name: order.shippingName,
                        phone: order.shippingPhone,
                        email: order.user?.email || "contact@karixcomputers.ro",
                        address: senderAddress
                    },
                    recipient: {
                        name: "Karix Computers",
                        phone: "0770619935",
                        email: "contact@karixcomputers.ro",
                        address: {
                            county: "Bihor",
                            locality: "Oradea",
                            street: "Str. Sovata",
                            streetNo: "52", 
                            zipCode: "" 
                        }
                    }
                }
            ]
        };

        // Adăugăm opțiunile doar dacă nu e array gol (evităm o eroare rară a API-ului FAN)
        if (optionsArray.length > 0) {
            payload.shipments[0].info.options = optionsArray;
        }

        console.log("📤 PAYLOAD REVERSE AWB:", JSON.stringify(payload.shipments[0].info));

        const response = await fetch("https://api.fancourier.ro/intern-awb", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.response && Array.isArray(data.response) && data.response[0].awbNumber) {
             const awbGenerated = String(data.response[0].awbNumber); 
             console.log(`✅ AWB INVERS GENERAT CU SUCCES: ${awbGenerated} | Mod Predare: ${serviceType}`);
             return awbGenerated;
        }

        const errorMessage = data?.response?.[0]?.errors || data?.message || JSON.stringify(data);
        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));

    } catch (error) {
        console.error("❌ Eroare auto-generare REVERSE AWB:", error.message);
        throw error;
    }
}