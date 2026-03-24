import fetch from "node-fetch";

const getAuthHeader = () => {
    const credentials = `${process.env.SMARTBILL_USER}:${process.env.SMARTBILL_TOKEN}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
};

export const createSmartBillInvoice = async (order) => {
    try {
        const authHeader = getAuthHeader();
        
        // 1. Formatăm produsele pentru SmartBill
        const products = (order.items || []).map(item => {
            return {
                name: item.productName || "Produs Karix",
                code: item.productId ? String(item.productId) : "SKU-00",
                isDiscount: false,
                measuringUnitName: "buc",
                currency: "RON",
                quantity: item.qty || 1,
                price: ((item.priceCentsAtBuy || item.priceCents || 0) / 100).toFixed(2),
                isTaxIncluded: true,
                taxName: "Scutita", // Pentru firme neplătitoare de TVA
                taxPercentage: 0    // 0% TVA
            };
        });

        // Fallback în caz că items e gol
        if (products.length === 0) {
            products.push({
                name: `Comanda Karix #${order.id}`,
                code: "CMD",
                isDiscount: false,
                measuringUnitName: "buc",
                currency: "RON",
                quantity: 1,
                price: ((order.totalCents || 0) / 100).toFixed(2),
                isTaxIncluded: true,
                taxName: "Scutita",
                taxPercentage: 0
            });
        }

        // 2. Construim cererea (Payload)
        const payload = {
            companyVatCode: process.env.SMARTBILL_CUI,
            client: {
                name: order.isCompany ? order.companyName : (order.shippingName || "Client Karix"),
                vatCode: order.isCompany ? order.cui : "",
                regCom: order.isCompany ? order.regCom : "",
                address: order.shippingAddress || "Adresa nespecificata",
                isTaxPayer: order.isCompany,
                city: "Oradea", // Implicit (poti adapta daca adaugi camp separat de oras in baza de date)
                county: "Bihor",
                country: "Romania",
                email: order.user?.email || "client@karix.ro",
                saveToDb: true
            },
            issueDate: new Date().toISOString().split("T")[0],
            seriesName: process.env.SMARTBILL_SERIA,
            isDraft: true, // <--- ⚠️ SETAT PE TRUE (CIORNĂ) PENTRU TESTE SIGURE
            dueDate: new Date().toISOString().split("T")[0],
            products: products
        };

        // 3. Trimitem datele la SmartBill
        const response = await fetch("https://ws.smartbill.ro/SBORO/api/invoice", {
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.errorText || "Eroare la crearea facturii în SmartBill");
        }

        return data; // Returnează seria și numărul (ex: KRXCOMP 1)

    } catch (error) {
        console.error("❌ Eroare SmartBill API:", error.message);
        return null;
    }
};

export const getSmartBillPdf = async (seriesName, number) => {
    try {
        const authHeader = getAuthHeader();
        const cui = process.env.SMARTBILL_CUI;
        
        const response = await fetch(`https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cui}&seriesname=${seriesName}&number=${number}`, {
            method: "GET",
            headers: {
                "Authorization": authHeader,
                "Accept": "application/octet-stream"
            }
        });

        if (!response.ok) throw new Error("Nu am putut descărca PDF-ul facturii.");

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer); 
    } catch (error) {
        console.error("❌ Eroare Descărcare PDF SmartBill:", error.message);
        return null;
    }
};