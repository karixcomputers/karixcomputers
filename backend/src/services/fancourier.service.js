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
        
        console.log("🔍 Răspuns Autentificare FAN Courier:", data);

        const extractedToken = data?.data?.token || data?.token;

        if (extractedToken) {
            currentToken = extractedToken;
            tokenExpiration = new Date(new Date().getTime() + 23 * 60 * 60 * 1000);
            return currentToken;
        } else {
            throw new Error(data.message || JSON.stringify(data) || "Nu s-a putut extrage token-ul.");
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
        const fakeAwb = `TEST_AWB_${Math.floor(Math.random() * 100000000)}`;
        return fakeAwb; 
    }

    try {
        const token = await getFanToken();
        const clientId = process.env.FAN_CLIENT_ID;

        if (!clientId) throw new Error("FAN_CLIENT_ID lipsește din .env");

        const addressParts = order.shippingAddress.split(',').map(s => s.trim());
        const county = addressParts.length >= 3 ? addressParts[addressParts.length - 1] : "Bucuresti";
        const locality = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : "Bucuresti";
        const street = addressParts.length >= 1 ? addressParts[0] : "Adresa nespecificata";

        // Suma de ramburs (0 daca e platit online/OP, valoarea comenzii daca e ramburs curier)
        const rambursValue = (order.paymentMethod === 'online' || order.paymentMethod === 'transfer_bancar') ? 0 : (order.totalCents / 100);

        // Stabilim tipul serviciului corect conform documentatiei
        const serviceType = rambursValue > 0 ? "Cont Colector" : "Standard";

        const payload = {
            clientId: parseInt(clientId),
            shipments: [
                {
                    info: {
                        service: serviceType, // 'Standard' sau 'Cont Colector'
                        packages: { parcel: parseInt(packagesCount), envelopes: 0 },
                        weight: parseInt(weight),
                        payment: "sender", // Tu platesti curierul (conform contractului tau)
                        observation: `Comanda Karix #${String(order.id).slice(-8)}`,
                        content: "Sistem PC / Componente Hardware",
                        dimensions: { length: 40, height: 40, width: 20 }, 
                        cod: rambursValue // Aici e cheia reparata conform PDF-ului (Cash On Delivery)
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
        
        console.log("🔍 Răspuns FAN Courier Creare AWB:", JSON.stringify(data, null, 2));

        if (data.status === "error" || !data.data || !Array.isArray(data.data) || data.data.length === 0 || data.data[0].errors) {
             const errorMessage = data?.data?.[0]?.errors || data?.message || JSON.stringify(data);
             throw new Error(`Refuzat de FAN Courier: ${typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)}`);
        }

        return data.data[0].awbNumber;

    } catch (error) {
        console.error("❌ Eroare creare AWB FAN:", error.message);
        throw error;
    }
}