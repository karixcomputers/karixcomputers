import fetch from "node-fetch";

export const createSmartBillInvoice = async (order) => {
    try {
        console.log("=== 1. START SMARTBILL (Pe SBORO) ===");
        const auth = Buffer.from(`${process.env.SMARTBILL_USER}:${process.env.SMARTBILL_TOKEN}`).toString("base64");
        
        const products = (order.items || []).map(item => ({
            name: item.productName || "Produs Karix",
            code: String(item.productId || "SKU"),
            isTaxIncluded: true,
            measuringUnitName: "buc",
            currency: "RON",
            quantity: item.qty || 1,
            price: (item.priceCentsAtBuy || item.priceCents || 0) / 100,
            isService: false,
            vatRate: 19 // ATENȚIE: Pune 0 aici dacă ești firmă neplătitoare de TVA!
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
            seriesName: process.env.SMARTBILL_SERIA, // Trebuie să fie KRXCOMP
            isDraft: false,
            dueDate: new Date().toISOString().split("T")[0],
            isCollecting: false, 
            observations: "ACHITAT ONLINE CU CARDUL (NETOPIA). NU MAI NECESITĂ PLATĂ.",
            products: products
        };

        // AM PUS SBORO - AICI E CONTUL TĂU
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

        if (!response.ok) {
            console.log("=== 3. EROARE DE LA SMARTBILL HTTP ===", response.status);
            return null;
        }

        const data = JSON.parse(text);
        console.log("=== 4. FACTURA CREATA ===", data.series, data.number);
        return data;

    } catch (error) {
        console.log("=== CRASH IN COD ===", error.message);
        return null;
    }
};

export const getSmartBillPdf = async (seriesName, number) => {
    try {
        const auth = Buffer.from(`${process.env.SMARTBILL_USER}:${process.env.SMARTBILL_TOKEN}`).toString("base64");
        const cui = process.env.SMARTBILL_CUI;
        
        // AM PUS SBORO ȘI PARAMETRII CORECȚI (cif și seriesname)
        const url = `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cui}&seriesname=${seriesName}&number=${number}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Accept": "application/octet-stream",
                "User-Agent": "KarixApp/1.0"
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.log("=== EROARE DESCARCARE PDF ===", text);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer); 
    } catch (error) {
        console.log("=== CRASH DESCARCARE PDF ===", error.message);
        return null;
    } 
};