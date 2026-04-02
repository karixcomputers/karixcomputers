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
// 2. GENERARE AWB REAL
// ==========================================
export async function createFanAWB(order, isTestMode = false, weight = 1, packagesCount = 1) { 
    console.log(`📦 Inițiere generare AWB pentru comanda #${order.id}. Greutate: ${weight}kg, Colete: ${packagesCount}`);

    if (isTestMode) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return `TEST_AWB_${Math.floor(Math.random() * 100000000)}`; 
    }

    try {
        const token = await getFanToken();
        const clientIdString = process.env.FAN_CLIENT_ID;

        if (!clientIdString) {
             throw new Error("FAN_CLIENT_ID lipsește din .env");
        }
        
        const clientIdNum = parseInt(String(clientIdString).trim(), 10);

        // 👉 1. Curățăm adresa de separatorul "| Note:"
        let rawAddress = order.shippingAddress || "";
        if (rawAddress.includes("| Note:")) {
            rawAddress = rawAddress.split("| Note:")[0].trim();
        }

        // 👉 2. Extragem corect Strada, Orașul și Județul (indiferent câte virgule sunt în stradă)
        const addressParts = rawAddress.split(',').map(s => s.trim()).filter(Boolean);
        
        let county = "Bucuresti";
        let locality = "Bucuresti";
        let street = rawAddress;

        if (addressParts.length >= 3) {
            county = addressParts.pop(); // Ultimul element este mereu județul
            locality = addressParts.pop(); // Penultimul este orașul
            street = addressParts.join(', '); // Restul reconstruim ca fiind strada completă
        } else if (addressParts.length === 2) {
            county = addressParts[1];
            locality = addressParts[1];
            street = addressParts[0];
        }

        // 👉 3. Funcție pentru Auto-Corectarea numelor pentru FAN Courier
        const formatForFan = (str) => {
            // Face prima literă mare la fiecare cuvânt
            let formatted = str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            
            // Corecții specifice (FAN e sensibil la cratime)
            const noSpaces = formatted.replace(/\s+/g, '');
            if (noSpaces === "ClujNapoca") return "Cluj-Napoca";
            if (noSpaces === "BistritaNasaud") return "Bistrita-Nasaud";
            if (noSpaces === "CarasSeverin") return "Caras-Severin";
            
            // București are mereu localitatea "Bucuresti"
            if (noSpaces.includes("Bucuresti") || noSpaces.includes("Sector")) return "Bucuresti";

            return formatted;
        };

        locality = formatForFan(locality);
        county = formatForFan(county);

        // Suma ramburs
        const rambursValue = (order.paymentMethod === 'online' || order.paymentMethod === 'transfer_bancar') ? 0 : (order.totalCents / 100);
        const serviceType = rambursValue > 0 ? "Cont Colector" : "Standard";

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
                        cod: rambursValue
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

        console.log("📤 PAYLOAD FINAL:", JSON.stringify(payload.shipments[0].recipient.address));

        const response = await fetch("https://api.fancourier.ro/intern-awb", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("🔍 Răspuns FAN Courier Creare AWB:", JSON.stringify(data, null, 2));

        if (data.response && Array.isArray(data.response) && data.response[0].awbNumber) {
             const awbGenerated = data.response[0].awbNumber;
             console.log(`✅ AWB GENERAT CU SUCCES: ${awbGenerated}`);
             return awbGenerated;
        }

        const errorMessage = data?.response?.[0]?.errors || data?.message || JSON.stringify(data);
        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));

    } catch (error) {
        console.error("❌ Eroare auto-generare AWB:", error.message);
        throw error;
    }
}