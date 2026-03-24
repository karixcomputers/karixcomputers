import fetch from "node-fetch";

export const createSmartBillInvoice = async (order) => {
    try {
        console.log("⏳ START SMARTBILL...");
        
        const products = (order.items || []).map(item => ({
            name: item.productName || "Produs Karix",
            code: String(item.productId || "SKU"),
            isTaxIncluded: true,
            measuringUnitName: "buc",
            currency: "RON",
            quantity: item.qty || 1,
            price: (item.priceCentsAtBuy || item.priceCents || 0) / 100,
            isService: false,
            vatRate: 19 // Pune 0 dacă firma ta e neplătitoare de TVA
        }));

        const payload = {
            companyVatCode: process.env.SMARTBILL_CUI,
            client: {
                name: order.isCompany ? order.companyName : (order.shippingName || "Client Karix"),
                vatCode: order.isCompany ? order.cui : "",
                regCom: order.isCompany ? order.regCom : "",
                address: order.shippingAddress || "Oradea",
                isTaxPayer: !!order.isCompany,
                city: "Oradea",
                county: "Bihor",
                country: "Romania",
                email: order.user?.email || "karixcomputers@gmail.com",
                saveToDb: true
            },
            issueDate: new Date().toISOString().split("T")[0],
            seriesName: process.env.SMARTBILL_SERIA,
            isDraft: false,
            dueDate: new Date().toISOString().split("T")[0],
            
            // FĂRĂ CHITANȚĂ, DOAR TEXTUL:
            isCollecting: false,
            observations: "ACHITAT ONLINE CU CARDUL (NETOPIA). NU MAI NECESITĂ PLATĂ.",
            
            products: products
        };

        const auth = Buffer.from(`${process.env.SMARTBILL_USER}:${process.env.SMARTBILL_TOKEN}`).toString("base64");
        
        const response = await fetch("https://ws.smartbill.ro/SBIT/api/invoice", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("📄 Răspuns API:", data);

        if (!response.ok) return null;
        return data;

    } catch (error) {
        console.error("❌ EROARE:", error);
        return null;
    }
};

export const getSmartBillPdf = async (series, number) => {
    try {
        const auth = Buffer.from(`${process.env.SMARTBILL_USER}:${process.env.SMARTBILL_TOKEN}`).toString("base64");
        const cui = process.env.SMARTBILL_CUI;
        const url = `https://ws.smartbill.ro/SBIT/api/invoice/pdf?cui=${cui}&series=${series}&number=${number}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": `Basic ${auth}`, "Accept": "application/octet-stream" }
        });

        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        return null;
    }
};