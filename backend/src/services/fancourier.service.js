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
    if (currentToken && tokenExpiration && new Date() < tokenExpiration) {
        return currentToken;
    }

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
        } else {
            throw new Error(data.message || "Eroare token");
        }
    } catch (error) {
        console.error("❌ Eroare FAN Courier Auth:", error.message);
        throw error;
    }
}

// ==========================================
// 1.5. AUTENTIFICARE PENTRU CONT OCAZIONAL (RETUR)
// ==========================================
export async function getFanReturnToken() {
    if (currentReturnToken && returnTokenExpiration && new Date() < returnTokenExpiration) {
        return currentReturnToken;
    }

    // Fallback: Dacă nu ai pus user de retur în .env, îl va folosi pe cel principal
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
        } else {
            throw new Error(data.message || "Eroare token retur");
        }
    } catch (error) {
        console.error("❌ Eroare FAN Courier Auth Retur:", error.message);
        throw error;
    }
}

// Helper formatare text pentru FAN (fără diacritice, prima litera mare)
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
// 2. GENERARE AWB STANDARD (Karix -> Client)
// ==========================================
export async function createFanAWB(order, isTestMode = false, weight = 1, packagesCount = 1, isInsured = false) { 
    if (isTestMode) return `TEST_AWB_${Math.floor(Math.random() * 100000000)}`; 

    try {
        const token = await getFanToken();
        const clientIdNum = parseInt(String(process.env.FAN_CLIENT_ID).trim(), 10);

        let rawAddress = order.shippingAddress || "";
        if (rawAddress.includes("| Note:")) rawAddress = rawAddress.split("| Note:")[0].trim();

        // Identificare FANbox
        const isLocker = (order.serviceDeliveryMethod === "fanbox") || rawAddress.toLowerCase().includes("fanbox") || rawAddress.toLowerCase().includes("locker");

        let county = "Bucuresti";
        let locality = "Bucuresti";
        let street = rawAddress;

        if (isLocker && rawAddress.includes("-")) {
             const parts = rawAddress.split("-");
             if (parts.length > 1) {
                 const addrParts = parts[1].split(",");
                 if (addrParts.length >= 2) {
                     county = addrParts[0].trim();
                     locality = addrParts[1].trim();
                 }
             }
        } else {
             const addressParts = rawAddress.split(',').map(s => s.trim()).filter(Boolean);
             if (addressParts.length >= 3) {
                 county = addressParts.pop(); 
                 locality = addressParts.pop(); 
                 street = addressParts.join(', '); 
             } else if (addressParts.length === 2) {
                 county = addressParts[1];
                 locality = addressParts[1];
                 street = addressParts[0];
             }
        }

        const orderTotalRon = (order.totalCents / 100);
        const rambursValue = (order.paymentMethod === 'online' || order.paymentMethod === 'transfer_bancar') ? 0 : orderTotalRon;
        
        let serviceType = isLocker ? "FANbox" : (rambursValue > 0 ? "Cont Colector" : "Standard");
        
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
                        declaredValue: isInsured ? orderTotalRon : 0,
                        options: isLocker ? ["X"] : []
                    },
                    recipient: {
                        name: order.shippingName,
                        phone: order.shippingPhone,
                        email: order.user?.email || "contact@karixcomputers.ro",
                        address: {
                            county: formatForFan(county),
                            locality: formatForFan(locality),
                            street: street,
                            streetNo: "-", 
                            zipCode: "",
                            ...(isLocker && order.fanboxLocationId && { pudoLocationId: order.fanboxLocationId })
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
        // 👉 AICI ESTE SECRETUL: Folosim token-ul de retur!
        const token = await getFanReturnToken();
        const clientIdNum = parseInt(String(process.env.FAN_RETURN_CLIENT_ID || process.env.FAN_CLIENT_ID).trim(), 10);

        let rawAddress = order.shippingAddress || "";
        const cleanPhone = order.shippingPhone.replace(/\D/g, "");
        
        const isLocker = (order.serviceDeliveryMethod === "fanbox") || rawAddress.toLowerCase().includes("fanbox") || rawAddress.toLowerCase().includes("locker");

        let county = "Bucuresti";
        let locality = "Bucuresti";
        let street = rawAddress;

        if (isLocker && rawAddress.includes("-")) {
             const parts = rawAddress.split("-");
             if (parts.length > 1) {
                 const addrParts = parts[1].split(",");
                 if (addrParts.length >= 2) {
                     county = addrParts[0].trim();
                     locality = addrParts[1].trim();
                 }
             }
        } else {
             const addressParts = rawAddress.split(',').map(s => s.trim()).filter(Boolean);
             if (addressParts.length >= 3) {
                 county = addressParts.pop(); 
                 locality = addressParts.pop(); 
                 street = addressParts.join(', '); 
             }
        }

        let serviceType = isLocker ? "FANbox" : "Standard";
        
        const payload = {
            clientId: clientIdNum,
            shipments: [
                {
                    info: {
                        service: serviceType,
                        packages: { parcel: 1, envelopes: 0 },
                        weight: 5,
                        payment: "recipient", 
                        observation: `Retur Service Comanda #${String(order.id).slice(-8)}`,
                        content: "Laptop / Consola (Service)",
                        dimensions: { length: 40, height: 40, width: 20 }, 
                        cod: 0,
                        declaredValue: 0,
                        options: isLocker ? ["W"] : []
                    },
                    sender: {
                        name: order.shippingName,
                        phone: cleanPhone,
                        email: order.user?.email || "contact@karixcomputers.ro",
                        address: {
                            county: formatForFan(county),
                            locality: formatForFan(locality),
                            street: isLocker ? "Predare la locker FANbox" : street,
                            streetNo: "-", 
                            zipCode: "",
                            ...(isLocker && order.fanboxLocationId && { dropOffLocationId: order.fanboxLocationId })
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

        console.log("\n==========================================");
        console.log(`📦 PAYLOAD TRIMIS SPRE FAN COURIER (COMANDA #${order.id}):`);
        console.log(JSON.stringify(payload, null, 2));
        console.log("==========================================\n");

        const response = await fetch("https://api.fancourier.ro/intern-awb", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.response && Array.isArray(data.response) && data.response[0].awbNumber) {
             console.log(`✅ AWB INVERS GENERAT: ${data.response[0].awbNumber}`);
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