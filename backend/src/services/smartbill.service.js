import fetch from "node-fetch";

// Helper pentru autentificare ca să nu repetăm codul
const getAuthHeaders = () => {
    const USER = (process.env.SMARTBILL_USER || "").trim();
    const TOKEN = (process.env.SMARTBILL_TOKEN || "").trim();
    return Buffer.from(`${USER}:${TOKEN}`).toString("base64");
};

export const createSmartBillInvoice = async (order) => {
    try {
        console.log("=== 1. START SMARTBILL INVOICE ===");
        
        const CUI = (process.env.SMARTBILL_CUI || "").trim();
        const SERIA = (process.env.SMARTBILL_SERIA || "").trim();
        const auth = getAuthHeaders();
        
        const clientObj = {
            name: order.isCompany ? order.companyName : (order.shippingName || "Client Karix"),
            address: order.shippingAddress || "România",
            country: "Romania",
            isTaxPayer: !!order.isCompany,
            saveToDb: false
        };

        if (order.isCompany && order.cui) {
            clientObj.vatCode = order.cui;
        }

        const products = (order.items || []).map(item => ({
            name: item.productName || "Produs Karix",
            code: String(item.productId || "00"),
            measuringUnitName: "buc",
            currency: "RON",
            quantity: Number(item.qty || 1),
            price: Number(((item.priceCentsAtBuy || item.priceCents || 0) / 100).toFixed(2)), 
            isTaxIncluded: false
        }));

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
        console.log("=== CRASH ===", error.message);
        return null;
    }
};

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
// 🚀 FUNCȚII NOI PENTRU PROFORME (ESTIMATE)
// ==========================================

export const createSmartBillProforma = async (order, clientData, cartItems) => {
    try {
        console.log("=== 1. START SMARTBILL PROFORMA ===");
        
        const CUI = (process.env.SMARTBILL_CUI || "").trim();
        // IDEAL: Să ai o serie separată pentru proforme în .env (ex: SMARTBILL_PROFORMA_SERIA=PROF)
        const SERIA_PROFORMA = (process.env.SMARTBILL_PROFORMA_SERIA || process.env.SMARTBILL_SERIA || "").trim();
        const auth = getAuthHeaders();
        
        const clientObj = {
            name: clientData.isCompany ? clientData.companyName : (clientData.name || "Client Karix"),
            address: `${clientData.addressDetails}, ${clientData.city}, ${clientData.county}` || "România",
            country: "Romania",
            isTaxPayer: !!clientData.isCompany,
            saveToDb: false
        };

        if (clientData.isCompany && clientData.cui) {
            clientObj.vatCode = clientData.cui;
        }

        const products = (cartItems || []).map(item => ({
            name: item.productName || item.name || "Produs Karix",
            code: String(item.id || item.productId || "00"),
            measuringUnitName: "buc",
            currency: "RON",
            quantity: Number(item.qty || 1),
            price: Number(((item.priceCentsAtBuy || item.priceCents || 0) / 100).toFixed(2)), 
            isTaxIncluded: false
        }));

        // Setăm data scadentă (7 zile de la emitere)
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

        // SmartBill folosește /estimate pentru proforme
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

export const getSmartBillProformaPdf = async (seriesName, number) => {
    try {
        const CUI = (process.env.SMARTBILL_CUI || "").trim();
        const auth = getAuthHeaders();
        
        // Endpoint diferit pentru PDF-ul de proformă
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