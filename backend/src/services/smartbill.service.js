import axios from "axios";

const getAuthHeader = () => {
    const credentials = `${process.env.SMARTBILL_USER}:${process.env.SMARTBILL_TOKEN}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
};

export const createSmartBillInvoice = async (order) => {
    try {
        console.log("⏳ START SMARTBILL (cu Axios)...");
        
        const products = (order.items || []).map(item => ({
            name: item.productName || "Produs Karix",
            code: String(item.productId || "SKU"),
            isTaxIncluded: true,
            measuringUnitName: "buc",
            currency: "RON",
            quantity: item.qty || 1,
            price: (item.priceCentsAtBuy || item.priceCents || 0) / 100,
            isService: false,
            vatRate: 19 // Sau 0 dacă ești neplătitor
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
            isCollecting: false,
            observations: "ACHITAT ONLINE CU CARDUL (NETOPIA). NU MAI NECESITĂ PLATĂ.",
            products: products
        };

        // Am adăugat timeout de 10 secunde ca să nu mai stea agățat
        const response = await axios({
            method: 'post',
            url: "https://ws.smartbill.ro/SBIT/api/invoice",
            headers: {
                "Authorization": getAuthHeader(),
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KarixApp/1.0"
            },
            data: payload,
            timeout: 10000 
        });

        console.log("✅ FACTURA CREATĂ:", response.data.series, response.data.number);
        return response.data;

    } catch (error) {
        // Axios ne dă erori mult mai detaliate
        if (error.response) {
            console.error("❌ EROARE SMARTBILL (Server):", error.response.status, error.response.data);
        } else if (error.request) {
            console.error("❌ EROARE SMARTBILL (Rețea - Nu răspunde):", error.message);
        } else {
            console.error("❌ CRASH SMARTBILL SERVICE:", error.message);
        }
        return null;
    }
};

export const getSmartBillPdf = async (seriesName, number) => {
    try {
        const cui = process.env.SMARTBILL_CUI;
        const url = `https://ws.smartbill.ro/SBIT/api/invoice/pdf?cui=${cui}&series=${seriesName}&number=${number}`;
        
        const response = await axios({
            method: 'get',
            url: url,
            headers: {
                "Authorization": getAuthHeader(),
                "Accept": "application/octet-stream",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KarixApp/1.0"
            },
            responseType: 'arraybuffer', // Axios știe să aducă fișiere ușor așa
            timeout: 15000
        });

        return Buffer.from(response.data); 
    } catch (error) {
        console.error("❌ Eroare Descărcare PDF SmartBill:", error.message);
        return null;
    } 
};