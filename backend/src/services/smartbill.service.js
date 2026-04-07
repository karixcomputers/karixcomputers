import fetch from "node-fetch";

// Helper pentru autentificare ca să nu repetăm codul
const getAuthHeaders = () => {
    const USER = (process.env.SMARTBILL_USER || "").trim();
    const TOKEN = (process.env.SMARTBILL_TOKEN || "").trim();
    return Buffer.from(`${USER}:${TOKEN}`).toString("base64");
};

// 👉 HELPER PENTRU CURĂȚAREA ADRESEI PE FACTURĂ
const getCleanAddress = (rawAddress) => {
    if (!rawAddress) return "România";
    let clean = rawAddress.split("| Note:")[0].trim();
    if (clean.includes("| Locker:")) {
        clean = clean.split("| Locker:")[0].trim();
    }
    // Mai putem adăuga curățare pentru prefixul de locker manual dacă există
    clean = clean.replace(/Locker FANbox:.*?($|-)/i, '').trim();
    // Dacă după curățare rămân virgule inutile la final
    clean = clean.replace(/,\s*$/, "");
    return clean || "România";
};

// 👉 HELPER PENTRU ADAUGAREA TRANSPORTULUI CA PRODUS
const buildProductsList = (items, shippingCents) => {
    const products = (items || []).map(item => ({
        name: item.productName || item.name || "Produs Karix",
        code: String(item.productId || item.id || "00"),
        measuringUnitName: "buc",
        currency: "RON",
        quantity: Number(item.qty || 1),
        price: Number(((item.priceCentsAtBuy || item.priceCents || 0) / 100).toFixed(2)), 
        isTaxIncluded: false
    }));

    // Dacă avem un cost de transport, adăugăm o linie separată pe factură
    if (shippingCents && Number(shippingCents) > 0) {
        products.push({
            name: "Servicii de curierat",
            code: "TRANSPORT",
            measuringUnitName: "buc",
            currency: "RON",
            quantity: 1,
            price: Number((Number(shippingCents) / 100).toFixed(2)),
            isTaxIncluded: false
        });
    }

    return products;
};

// ==========================================
// 1. CREARE FACTURĂ FISCALĂ FINALĂ
// ==========================================
export const createSmartBillInvoice = async (order) => {
    try {
        console.log("=== 1. START SMARTBILL INVOICE ===");
        
        const CUI = (process.env.SMARTBILL_CUI || "").trim();
        const SERIA = (process.env.SMARTBILL_SERIA || "").trim();
        const auth = getAuthHeaders();
        
        const cleanAddress = getCleanAddress(order.shippingAddress);

        const clientObj = {
            name: order.isCompany ? order.companyName : (order.shippingName || "Client Karix"),
            address: cleanAddress,
            country: "Romania",
            isTaxPayer: !!order.isCompany,
            saveToDb: false
        };

        if (order.isCompany && order.cui) {
            clientObj.vatCode = order.cui;
        }
        if (order.isCompany && order.regCom) {
            clientObj.regCom = order.regCom;
        }

        const products = buildProductsList(order.items, order.shippingCents);

        const payload = {
            companyVatCode: CUI,
            client: clientObj,
            issueDate: new Date().toISOString().split("T")[0],
            seriesName: SERIA,
            isDraft: false,
            products: products
        };

        const response = await fetch("https://ws.smartbill.ro/SBORO/api/invoice", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.log("=== 4. EROARE INVOICE ===", await response.text());
            return null;
        }

        const data = await response.json();
        console.log("=== 5. FACTURA CREATA ===", data.series, data.number);
        return data;

    } catch (error) {
        console.log("=== CRASH INVOICE ===", error.message);
        return null;
    }
};

// ==========================================
// 2. DESCĂRCARE PDF FACTURĂ FINALĂ
// ==========================================
export const getSmartBillPdf = async (seriesName, number) => {
    try {
        const CUI = (process.env.SMARTBILL_CUI || "").trim();
        const auth = getAuthHeaders();
        
        const url = `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${CUI}&seriesname=${seriesName}&number=${number}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Accept": "application/octet-stream"
            }
        });

        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer); 
    } catch (error) {
        return null;
    } 
};

// ==========================================
// 3. CREARE PROFORMĂ (ESTIMATE)
// ==========================================
export const createSmartBillProforma = async (order, clientData, cartItems) => {
    try {
        console.log("=== 1. START SMARTBILL PROFORMA ===");
        
        const CUI = (process.env.SMARTBILL_CUI || "").trim();
        const SERIA_PROFORMA = (process.env.SMARTBILL_PROFORMA_SERIA || process.env.SMARTBILL_SERIA || "").trim();
        const auth = getAuthHeaders();
        
        // Formăm adresa inițială combinând componentele din checkout, apoi o curățăm
        const rawAddress = `${clientData.addressDetails}, ${clientData.city}, ${clientData.county}`;
        let cleanAddress = getCleanAddress(rawAddress);
        
        // Extra fallback dacă formatarea a rezultat într-un string gol sau doar virgule
        if (!cleanAddress || cleanAddress.trim() === "," || cleanAddress.trim() === ", ,") {
            cleanAddress = "România";
        }

        const clientObj = {
            name: clientData.isCompany ? clientData.companyName : (clientData.name || "Client Karix"),
            address: cleanAddress,
            country: "Romania",
            isTaxPayer: !!clientData.isCompany,
            saveToDb: false
        };

        if (clientData.isCompany && clientData.cui) {
            clientObj.vatCode = clientData.cui;
        }
        if (clientData.isCompany && clientData.regCom) {
            clientObj.regCom = clientData.regCom;
        }

        // Construim produsele folosind funcția helper și shippingCents
        const products = buildProductsList(cartItems, order.shippingCents);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const payload = {
            companyVatCode: CUI,
            client: clientObj,
            issueDate: new Date().toISOString().split("T")[0],
            dueDate: dueDate.toISOString().split("T")[0], 
            seriesName: SERIA_PROFORMA,
            isDraft: false,
            products: products
        };

        const response = await fetch("https://ws.smartbill.ro/SBORO/api/estimate", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.log("=== EROARE PROFORMA ===", await response.text());
            return null;
        }

        const data = await response.json();
        console.log("=== PROFORMA CREATA ===", data.series, data.number);
        return data;

    } catch (error) {
        console.log("=== CRASH PROFORMA ===", error.message);
        return null;
    }
};

// ==========================================
// 4. DESCĂRCARE PDF PROFORMĂ
// ==========================================
export const getSmartBillProformaPdf = async (seriesName, number) => {
    try {
        const CUI = (process.env.SMARTBILL_CUI || "").trim();
        const auth = getAuthHeaders();
        
        const url = `https://ws.smartbill.ro/SBORO/api/estimate/pdf?cif=${CUI}&seriesname=${seriesName}&number=${number}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Accept": "application/octet-stream"
            }
        });

        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer); 
    } catch (error) {
        return null;
    } 
};