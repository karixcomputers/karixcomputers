import fetch from "node-fetch";

const getAuthHeader = () => {
    const credentials = `${process.env.SMARTBILL_USER}:${process.env.SMARTBILL_TOKEN}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
};

export const createSmartBillInvoice = async (order) => {
    try {
        const authHeader = getAuthHeader();
        
        const products = (order.items || []).map(item => ({
            name: item.productName || "Produs Karix",
            code: item.productId ? String(item.productId) : "SKU",
            isDiscount: false,
            measuringUnitName: "buc",
            currency: "RON",
            quantity: item.qty || 1,
            // AICI E REZOLVAREA 1: Fără toFixed, ca să rămână număr, nu string!
            price: (item.priceCentsAtBuy || item.priceCents || 0) / 100,
            isTaxIncluded: true
            // AICI E REZOLVAREA 2: Am sters taxName si taxPercentage. SmartBill va pune automat ce ai setat in cont (probabil "Neplatitor").
        }));

        const payload = {
            companyVatCode: process.env.SMARTBILL_CUI,
            client: {
                name: order.isCompany ? order.companyName : (order.shippingName || "Client Karix"),
                vatCode: order.isCompany ? order.cui : "",
                regCom: order.isCompany ? order.regCom : "",
                address: order.shippingAddress || "Adresa nespecificata",
                isTaxPayer: !!order.isCompany,
                city: "Oradea", 
                county: "Bihor",
                country: "Romania",
                email: order.user?.email || "client@karix.ro",
                saveToDb: true
            },
            issueDate: new Date().toISOString().split("T")[0],
            seriesName: process.env.SMARTBILL_SERIA, // Trebuie sa fie KRXCOMP in .env
            isDraft: false,
            dueDate: new Date().toISOString().split("T")[0],
            isCollecting: false,
            observations: "FACTURĂ ACHITATĂ ONLINE CU CARDUL (NETOPIA). NU MAI NECESITĂ PLATĂ.",
            products: products
        };

        const response = await fetch("https://ws.smartbill.ro/SBIT/api/invoice", {
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("📄 Răspuns API SmartBill:", data);

        if (!response.ok) {
            throw new Error(data.errorText || "Eroare la crearea facturii");
        }

        return data; 

    } catch (error) {
        console.error("❌ Eroare SmartBill API:", error.message);
        return null;
    }
};

export const getSmartBillPdf = async (seriesName, number) => {
    try {
        const authHeader = getAuthHeader();
        const cui = process.env.SMARTBILL_CUI;
        
        const url = `https://ws.smartbill.ro/SBIT/api/invoice/pdf?cui=${cui}&series=${seriesName}&number=${number}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": authHeader,
                "Accept": "application/octet-stream"
            }
        });

        if (!response.ok) throw new Error("Nu am putut descărca PDF-ul.");

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer); 
    } catch (error) {
        console.error("❌ Eroare Descărcare PDF SmartBill:", error.message);
        return null;
    } 
};