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

        if (!response.ok) throw new Error(`Eroare FAN Auth: ${response.status}`);

        const data = await response.json();
        if (data && data.token) {
            currentToken = data.token;
            tokenExpiration = new Date(new Date().getTime() + 23 * 60 * 60 * 1000);
            return currentToken;
        } else {
            throw new Error("Nu s-a putut extrage token-ul.");
        }
    } catch (error) {
        console.error("❌ Eroare FAN Courier Auth:", error);
        throw error;
    }
}

// ==========================================
// 2. GENERARE AWB (CU MOD DE TESTARE)
// ==========================================
export async function createFanAWB(order, isTestMode = true) { // 👈 TEST MODE E ACTIVAT AICI
    console.log(`📦 Inițiere generare AWB pentru comanda #${order.id}. Test Mode: ${isTestMode}`);

    if (isTestMode) {
        // Simulăm un delay ca și cum ar procesa request-ul
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fakeAwb = `TEST_AWB_${Math.floor(Math.random() * 100000000)}`;
        console.log(`✅ [TEST MODE] AWB Simulat cu succes: ${fakeAwb}`);
        return fakeAwb; 
    }

    try {
        const token = await getFanToken();
        const clientId = process.env.FAN_CLIENT_ID;

        if (!clientId) throw new Error("FAN_CLIENT_ID lipsește din .env");

        // Extragem județul și orașul din adresa salvată (salvată ca: Strada, Oraș, Județ)
        const addressParts = order.shippingAddress.split(',').map(s => s.trim());
        const county = addressParts.length >= 3 ? addressParts[addressParts.length - 1] : "Bucuresti";
        const locality = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : "Bucuresti";
        const street = addressParts.length >= 1 ? addressParts[0] : "Adresa nespecificata";

        // Construim payload-ul exact cum cere documentatia API
        const payload = {
            clientId: parseInt(clientId),
            shipments: [
                {
                    info: {
                        service: "Standard",
                        packages: { parcel: 1, envelopes: 0 },
                        weight: 2, // Default 2kg
                        payment: "sender", // Tu platesti transportul
                        observation: `Comanda Karix #${order.id}`,
                        content: "Sistem PC / Componente",
                        dimensions: { length: 20, height: 20, width: 20 }
                    },
                    recipient: {
                        name: order.shippingName,
                        phone: order.shippingPhone,
                        email: order.user?.email || "fara@email.com",
                        address: {
                            county: county,
                            locality: locality,
                            street: street,
                            streetNo: "1", 
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

        // Verificăm dacă FAN a returnat erori
        if (data.status === "error" || !data.data || !data.data[0] || data.data[0].errors) {
             throw new Error(JSON.stringify(data.data[0]?.errors || data.message));
        }

        // Returnăm numărul AWB-ului (FAN îl trimite sub cheia awbNumber conform documentatiei)
        return data.data[0].awbNumber;

    } catch (error) {
        console.error("❌ Eroare creare AWB FAN:", error);
        throw error;
    }
}