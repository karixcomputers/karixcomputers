import fetch from "node-fetch";

export const createSmartBillInvoice = async (order) => {
    try {
        console.log("=== 1. START SMARTBILL ===");
        const auth = Buffer.from(`${process.env.SMARTBILL_USER}:${process.env.SMARTBILL_TOKEN}`).toString("base64");
        
        const products = (order.items || []).map(item => ({
            name: item.productName || "Produs Karix",
            code: String(item.productId || "SKU"),
            measuringUnitName: "buc",
            currency: "RON",
            quantity: item.qty || 1,
            price: Number(((item.priceCentsAtBuy || item.priceCents || 0) / 100).toFixed(2)), 
            isTaxIncluded: true,
            vatRate: 19 // ATENTIE: Daca esti neplatitor de TVA, sterge 19 si pune 0 aici !!!
        }));

        const clientObj = {
            name: order.isCompany ? order.companyName : (order.shippingName || "Client Karix"),
            address: order.shippingAddress || "România",
            isTaxPayer: !!order.isCompany,
            city: "Oradea",
            county: "Bihor",
            country: "Romania",
            email: order.user?.email || "karixcomputers@gmail.com",
            saveToDb: false
        };

        if (order.isCompany && order.cui) clientObj.vatCode = order.cui;
        if (order.isCompany && order.regCom) clientObj.regCom = order.regCom;

        const payload = {
            companyVatCode: process.env.SMARTBILL_CUI,
            client: clientObj,
            issueDate: new Date().toISOString().split("T")[0],
            seriesName: process.env.SMARTBILL_SERIA,
            isDraft: false,
            dueDate: new Date().toISOString().split("T")[0],
            isCollecting: false, 
            observations: "ACHITAT ONLINE CU CARDUL (NETOPIA). NU MAI NECESITA PLATA.",
            products: products
        };

        // Rămânem pe SBORO, cu User-Agent ca să nu luăm 403
        const response = await fetch("https://ws.smartbill.ro/SBORO/api/invoice", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "KarixApp/1.0"
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log("=== 2. RASPUNS SMARTBILL ===", text);

        if (!response.ok) return null;

        const data = JSON.parse(text);
        console.log("=== 3. FACTURA CREATA ===", data.series, data.number);
        return data;

    } catch (error) {
        console.log("=== CRASH ===", error.message);
        return null;
    }
};

export const getSmartBillPdf = async (seriesName, number) => {
    try {
        const auth = Buffer.from(`${process.env.SMARTBILL_USER}:${process.env.SMARTBILL_TOKEN}`).toString("base64");
        const cui = process.env.SMARTBILL_CUI;
        
        const url = `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cui}&seriesname=${seriesName}&number=${number}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Accept": "application/octet-stream",
                "User-Agent": "KarixApp/1.0"
            }
        });

        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer); 
    } catch (error) {
        return null;
    } 
};