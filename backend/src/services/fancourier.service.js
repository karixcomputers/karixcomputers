import fetch from "node-fetch";

let currentToken = null;
let tokenExpiration = null;
let cachedClientId = null; // Vom salva ID-ul intern aici ca să nu-l cerem mereu

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
// 2. OBȚINERE AUTOMATĂ CLIENT ID INTERN
// ==========================================
export async function getFanClientId(token) {
    if (cachedClientId) return cachedClientId;

    try {
        const response = await fetch("https://api.fancourier.ro/clients", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });
        
        const data = await response.json();
        console.log("🔍 Răspuns API /clients (Ce vede FAN de fapt):", JSON.stringify(data, null, 2));

        if (data.status === 'success' && data.data && data.data.length > 0) {
            // Preluăm primul profil de client valid asociat contului tău
            cachedClientId = data.data[0].id;
            console.log(`✅ Am extras automat Client ID-ul corect: ${cachedClientId}`);
            return cachedClientId;
        }

        throw new Error("Contul tău de FAN Courier nu are niciun profil de client asociat în API. Trimite-le logul de mai sus celor de la IT.");
    } catch (error) {
        console.error("❌ Eroare obținere Client ID:", error.message);
        throw error;
    }
}

// ==========================================
// 3. GENERARE AWB REAL
// ==========================================
export async function createFanAWB(order, isTestMode = false, weight = 1, packagesCount = 1) { 
    console.log(`📦 Inițiere generare AWB pentru comanda #${order.id}. Greutate: ${weight}kg, Colete: ${packagesCount}`);

    if (isTestMode) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return `TEST_AWB_${Math.floor(Math.random() * 100000000)}`; 
    }

    try {
        const token = await getFanToken();
        
        // 👉 AICI ESTE MAGIA: Preluăm automat ID-ul real de pe serverele lor!
        const clientId = await getFanClientId(token);

        // Curățăm adresa de separatorul "| Note:"
        let rawAddress = order.shippingAddress || "";
        if (rawAddress.includes("| Note:")) {
            rawAddress = rawAddress.split("| Note:")[0].trim();
        }

        const addressParts = rawAddress.split(',').map(s => s.trim());
        const county = addressParts.length >= 3 ? addressParts[addressParts.length - 1] : "Bucuresti";
        const locality = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : "Bucuresti";
        const street = addressParts.length >= 1 ? addressParts[0] : "Adresa nespecificata";

        const rambursValue = (order.paymentMethod === 'online' || order.paymentMethod === 'transfer_bancar') ? 0 : (order.totalCents / 100);
        const serviceType = rambursValue > 0 ? "Cont Colector" : "Standard";

        const payload = {
            clientId: clientId, // Folosim ID-ul intern descărcat de la ei
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

        const response = await fetch("https://api.fancourier.ro/intern-awb", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.status === "error" || !data.data || !Array.isArray(data.data) || data.data.length === 0 || data.data[0].errors) {
             const errorMessage = data?.data?.[0]?.errors || data?.message || JSON.stringify(data);
             throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        }

        console.log("✅ AWB GENERAT CU SUCCES:", data.data[0].awbNumber);
        return data.data[0].awbNumber;

    } catch (error) {
        console.error("❌ Eroare auto-generare AWB:", error.message);
        throw error;
    }
}