import React, { useState, useMemo, useRef, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { formatRON } from "../utils/money";
import SEO from "../components/SEO";

const JUDETE = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brașov", "Brăila", "București", 
  "Buzău", "Caraș-Severin", "Călărași", "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", 
  "Giurgiu", "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", 
  "Mureș", "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj", "Sibiu", "Suceava", "Teleorman", "Timiș", 
  "Tulcea", "Vaslui", "Vâlcea", "Vrancea"
];

const parseAnafAddress = (rawAddress, judeteList) => {
  if (!rawAddress) return { county: "", city: "", cleanAddress: "" };
  
  let addr = rawAddress.toUpperCase();
  let county = "";
  let city = "";

  if (addr.includes("BUCUREŞTI") || addr.includes("BUCURESTI")) {
    county = "București";
    city = "București";
    addr = addr.replace(/MUN\.\s*BUCURE[ŞS]TI/g, '').replace(/SECTOR(UL)?\s*\d/g, '').replace(/SEC\.\s*\d/g, '');
  } else {
    const judMatch = addr.match(/JUD\.\s*([^,]+)/);
    if (judMatch) {
      county = judMatch[1].trim();
      addr = addr.replace(judMatch[0], ''); 
    }

    const cityMatch = addr.match(/(?:MUN\.|OR[ŞS]\.|COM\.|SAT)\s*([^,]+)/);
    if (cityMatch) {
      city = cityMatch[1].trim();
      addr = addr.replace(cityMatch[0], ''); 
    }
  }

  let cleanAddress = addr.replace(/^[,\s]+|[,\s]+$/g, '').replace(/,\s*,/g, ', ').trim();

  const toTitleCase = (str) => {
    if (!str) return "";
    return str.toLowerCase().replace(/(^|\s|-)\S/g, l => l.toUpperCase());
  };

  let matchedCounty = toTitleCase(county);
  if (county) {
    const noDiacritics = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');
    const countySearch = noDiacritics(county);
    const found = judeteList.find(j => noDiacritics(j) === countySearch);
    if (found) matchedCounty = found;
  }

  return {
    county: matchedCounty,
    city: toTitleCase(city),
    cleanAddress: toTitleCase(cleanAddress)
  };
};

const notifyDiscord = async (orderData, coupon) => {
  const WEBHOOK_URL = "https://discord.com/api/webhooks/1483959911363772491/v08mslfmiPRvt5VXqImwxKD3IABfgcVm5JuoY_vDlPOqqGh1qLgBHxPuNi2E4e3v4oNj";

  const clientInfo = orderData.client.isCompany 
    ? `🏢 **${orderData.client.companyName}**\nCUI: ${orderData.client.cui}`
    : `👤 **${orderData.client.name}**`;

  let paymentMethodInfo = "💳 Plată Online (Netopia)";
  if (orderData.paymentMethod === "transfer_bancar") {
    paymentMethodInfo = "🏦 Transfer Bancar (OP)";
  }

  const message = {
    embeds: [
      {
        title: "🚀 COMANDĂ NOUĂ KARIX!",
        color: 0x4f46e5, 
        fields: [
          { name: "📋 Tip Client", value: orderData.client.isCompany ? "Persoană Juridică (B2B)" : "Persoană Fizică", inline: true },
          { name: "👤 Identitate", value: clientInfo, inline: true },
          { name: "📞 Telefon", value: orderData.client.phone, inline: true },
          { name: "📍 Locație", value: `${orderData.client.city}, ${orderData.client.county}`, inline: true },
          { name: "📦 Livrare", value: orderData.pickupType === "KarixPersonal" ? "⚡ Personală (Oradea)" : "🚚 Curier", inline: true },
          { name: "💳 Metodă Plată", value: paymentMethodInfo, inline: true },
          { name: "💰 Total Final", value: `**${(orderData.total / 100).toFixed(2)} RON**`, inline: true },
          { name: "🎟️ Cupon", value: coupon ? `**${coupon.code}**` : "Niciunul", inline: true },
          { 
            name: "📋 Produse", 
            value: orderData.cartItems.map(item => `• ${item.productName} (x${item.qty}) [Garanție: ${item.warrantyMonths} Luni]`).join('\n') || "Niciun produs",
            inline: false 
          }
        ],
        footer: { text: "Karix Order BOT • " + new Date().toLocaleString('ro-RO') },
      },
    ],
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  } catch (err) {
    console.error("Eroare trimitere Discord:", err);
  }
};

export default function Checkout() {
  const { items, clearCart } = useCart();
  const { user, accessToken } = useAuth();
  const nav = useNavigate();
  const location = useLocation(); 
  
  const [loading, setLoading] = useState(false);
  const [showJudete, setShowJudete] = useState(false);
  const dropdownRef = useRef(null);
  
  const [errorToastOpen, setErrorToastOpen] = useState(false);
  const [errorToastMsg, setErrorToastMsg] = useState("");

  const [shipping, setShipping] = useState({ 
    name: "", 
    phone: "", 
    county: "", 
    city: "", 
    addressDetails: "",
    isCompany: false,
    companyName: "",
    cui: "",
    regCom: "",
    assemblyNotes: "" 
  });

  const [pickupByKarix, setPickupByKarix] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online"); 
  
  // 👉 Stări Service & FANbox
  const [serviceDeliveryMethod, setServiceDeliveryMethod] = useState("courier"); 
  const [selectedFanbox, setSelectedFanbox] = useState(null);
  const [returnToSameFanbox, setReturnToSameFanbox] = useState(true); // Bifa inteligenta

  const [termsAccepted, setTermsAccepted] = useState(false);
  const appliedCoupon = location.state?.coupon || null;

  // 👉 NOU: Inițializare Script Harta FANbox
  useEffect(() => {
    if (!document.getElementById("fanbox-script")) {
      const script = document.createElement("script");
      script.id = "fanbox-script";
      script.src = "https://unpkg.com/map-fanbox-points@latest/umd/map-fanbox-points.js";
      script.crossOrigin = "anonymous";
      script.defer = true;
      document.body.appendChild(script);
    }

    const handleSelectPoint = (e) => {
      setSelectedFanbox(e.detail.item);
    };

    window.addEventListener("map:select-point", handleSelectPoint);
    return () => {
      window.removeEventListener("map:select-point", handleSelectPoint);
    };
  }, []);

  const openFanboxMap = () => {
    if (window.LoadMapFanBox) {
      window.LoadMapFanBox({
        rootId: "fanbox-map-root", // Div-ul ascuns de la finalul paginii
      });
    } else {
      triggerError("Harta FAN Courier se încarcă. Te rugăm să aștepți 2 secunde și să încerci din nou.");
    }
  };

  const isAssemblyOrder = useMemo(() => {
    return items.some(i => {
      const n = (i.name || i.productName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return n.includes("asamblare");
    });
  }, [items]);

  const cartAnalysis = useMemo(() => {
    const isServiceKeywords = ['mentenanta', 'service', 'diagnosticare', 'curatare', 'montaj', 'reparatie', 'drift', 'hall', 'stick'];
    
    let hardwareSubtotal = 0;
    
    const hasPC = items.some(item => {
      const isSrv = item.category === 'service' || isServiceKeywords.some(kw => (item.name || "").toLowerCase().includes(kw));
      if (!isSrv) {
        hardwareSubtotal += ((item.priceCentsAtBuy || item.priceCents || 0) * (item.qty || 1));
        return true;
      }
      return false;
    });

    const hasService = items.some(item => {
      const name = (item.productName || item.name || "").toLowerCase();
      return item.category === 'service' || (!item.specs && isServiceKeywords.some(kw => name.includes(kw)));
    });

    return { hasPC, hasService, hardwareSubtotal };
  }, [items]);

  const pickupLabel = useMemo(() => {
    if (cartAnalysis.hasPC && cartAnalysis.hasService) return "Livrare & Ridicare Personală Karix";
    if (cartAnalysis.hasPC) return "Livrare Personală Karix (Doar Oradea)";
    return "Ridicare Personală Karix (Doar Oradea)";
  }, [cartAnalysis]);

  const pickupDescription = useMemo(() => {
    if (cartAnalysis.hasPC && cartAnalysis.hasService) return "Voi veni personal să ridic echipamentul pentru service și să livrez PC-ul nou.";
    if (cartAnalysis.hasPC) return "Vom livra personal noul PC în Oradea pentru siguranță maximă.";
    return "Vom veni noi să ridicăm pachetul de la adresa ta din Oradea.";
  }, [cartAnalysis]);

  useEffect(() => {
    if (pickupByKarix) {
      setShipping(prev => ({ ...prev, county: "Bihor", city: "Oradea" }));
    }
  }, [pickupByKarix]);

  const triggerError = (message) => {
    setErrorToastMsg(message);
    setErrorToastOpen(true);
    setTimeout(() => setErrorToastOpen(false), 5000);
  };

  useEffect(() => {
    if (user && !shipping.isCompany) {
      setShipping(prev => ({
        ...prev,
        name: prev.name || user.name || user.fullName || "", 
        phone: prev.phone || user.phone || user.phoneNumber || ""
      }));
    }
  }, [user, shipping.isCompany]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowJudete(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredJudete = useMemo(() => {
    const input = shipping.county.trim().toLowerCase();
    if (!input) return [];
    return JUDETE.filter(j => j.toLowerCase().startsWith(input));
  }, [shipping.county]);

  const currentSubtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + ((item.priceCentsAtBuy || item.priceCents || 0) * (item.qty || 1)), 0);
  }, [items]);

  const discountCents = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === "percentage") {
      return Math.round(currentSubtotal * (appliedCoupon.discountValue / 100));
    }
    return appliedCoupon.discountValue; 
  }, [appliedCoupon, currentSubtotal]);

  const shippingCents = useMemo(() => {
    if (pickupByKarix) return 0; 

    let cost = 0;
    if (cartAnalysis.hasPC && cartAnalysis.hardwareSubtotal < 1000 * 100) {
        cost += 2500; 
    }
    if (cartAnalysis.hasService && !isAssemblyOrder) {
        if (serviceDeliveryMethod === "courier") {
            cost += 3000; 
        } else if (serviceDeliveryMethod === "fanbox") {
            cost += 1500; 
        }
    }
    return cost;
  }, [pickupByKarix, cartAnalysis, isAssemblyOrder, serviceDeliveryMethod]);

  const totalCents = Math.max(0, currentSubtotal - discountCents + shippingCents);

  const handleSwitchToCompany = () => {
    setShipping(s => ({ ...s, isCompany: true, phone: "" }));
  };

  const handleSwitchToPerson = () => {
    setShipping(s => ({ ...s, isCompany: false, phone: user?.phone || user?.phoneNumber || s.phone }));
  };

  const fetchCompanyData = async (cuiInput) => {
    const cleanCui = cuiInput.replace(/[^0-9]/g, "");
    if (cleanCui.length < 2) return;

    try {
      const response = await fetch("https://api.karixcomputers.ro/api/orders/anaf", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cui: cleanCui })
      });

      const data = await response.json();

      if (data && data.found && data.found.length > 0) {
        const companyData = data.found[0].date_generale || data.found[0];
        const numeFirma = companyData.denumire || "";
        const registruComertului = companyData.nrRegCom || "";
        const telefonFirma = companyData.telefon || "";
        const parsedAddress = parseAnafAddress(companyData.adresa || "", JUDETE);

        const isBihor = parsedAddress.county?.toLowerCase() === "bihor";
        const isOradea = parsedAddress.city?.toLowerCase() === "oradea";
        const shouldAutoPickup = isBihor && isOradea;

        if (shouldAutoPickup && !isAssemblyOrder) {
          setPickupByKarix(true);
        }

        setShipping(s => ({
          ...s,
          companyName: numeFirma || s.companyName,
          regCom: registruComertului || s.regCom,
          phone: telefonFirma || s.phone,
          county: shouldAutoPickup || pickupByKarix ? "Bihor" : (parsedAddress.county || s.county),
          city: shouldAutoPickup || pickupByKarix ? "Oradea" : (parsedAddress.city || s.city),
          addressDetails: parsedAddress.cleanAddress || s.addressDetails
        }));
      } else {
        triggerError("CUI-ul introdus nu a fost găsit în baza ANAF.");
      }
    } catch (error) {
      console.warn("Auto-fill ANAF a eșuat:", error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!shipping.phone) {
      triggerError("Te rugăm să introduci un număr de telefon valid.");
      return;
    }

    // Validare FANbox si Adrese Standard
    const isFanboxSelected = cartAnalysis.hasService && !isAssemblyOrder && !pickupByKarix && serviceDeliveryMethod === "fanbox";
    const hideStandardAddress = isFanboxSelected && returnToSameFanbox;

    if (isFanboxSelected && !selectedFanbox) {
        triggerError("Te rugăm să selectezi un FANbox de pe hartă pentru predarea dispozitivului.");
        return;
    }

    if (!hideStandardAddress) {
      if (!isAssemblyOrder) {
        if (!shipping.addressDetails || !shipping.city || !shipping.county) {
          triggerError("Te rugăm să completezi datele complete de livrare.");
          return;
        }
      } else {
        if (!pickupByKarix && (!shipping.addressDetails || !shipping.city || !shipping.county)) {
           triggerError("Te rugăm să completezi adresa ta pentru a ști unde să livrăm PC-ul asamblat.");
           return;
        }
      }
    }

    if (shipping.isCompany) {
      if (!shipping.companyName || !shipping.cui) {
        triggerError("Te rugăm să completezi datele firmei (Nume și CUI).");
        return;
      }
    } else {
      if (!shipping.name) {
        triggerError("Te rugăm să introduci numele tău complet.");
        return;
      }
    }

    if (!termsAccepted) {
      triggerError("Trebuie să accepți Termenii și Condițiile pentru a plasa comanda.");
      return;
    }

    if (!accessToken) {
      triggerError("Sesiune expirată. Te rugăm să te reloghezi.");
      return;
    }

    setLoading(true);

    const enrichedItems = items.map(item => {
      const nameStr = (item.productName || item.name || "").toLowerCase();
      const isService = item.category === 'service' || 
                        ['mentenanta', 'service', 'curatare', 'reparatie'].some(kw => nameStr.includes(kw));
      
      let finalWarranty = 0;
      if (!isService) {
          let baseWarranty = (item.warrantyMonths !== undefined && item.warrantyMonths !== null) 
                             ? parseInt(item.warrantyMonths) : 24;
          finalWarranty = shipping.isCompany ? Math.min(baseWarranty, 12) : baseWarranty;
      }

      return {
        ...item,
        id: item.id,
        productName: item.name || item.productName, 
        qty: parseInt(item.qty || item.quantity || 1),
        priceCentsAtBuy: parseInt(item.priceCents || item.priceCentsAtBuy || 0),
        warrantyMonths: finalWarranty
      };
    });

    let finalAddressDetails = shipping.addressDetails;
    let finalCity = shipping.city;
    let finalCounty = shipping.county;

    // Logica inteligenta: Dacă se trimite la FANbox inapoi, inlocuim adresa cu datele FANbox-ului
    if (hideStandardAddress && selectedFanbox) {
        finalAddressDetails = `Locker FANbox: ${selectedFanbox.name} (${selectedFanbox.id}) - ${selectedFanbox.address}`;
        finalCity = "FANbox";
        finalCounty = "FANbox";
    } else if (isAssemblyOrder && shipping.assemblyNotes) {
       finalAddressDetails = `${shipping.addressDetails || "Fără adresă de livrare prestabilită"} | Note client: ${shipping.assemblyNotes}`;
    }

    const serviceOpts = cartAnalysis.hasService && !isAssemblyOrder && !pickupByKarix ? {
        serviceDeliveryMethod,
        fanboxLocationId: serviceDeliveryMethod === "fanbox" && selectedFanbox ? selectedFanbox.id : null
    } : {};

    const orderData = { 
      client: { 
        ...shipping, 
        addressDetails: finalAddressDetails, 
        city: finalCity,
        county: finalCounty,
        ...serviceOpts 
      }, 
      cartItems: enrichedItems,
      total: totalCents, 
      shippingCents: shippingCents,
      userEmail: user?.email, 
      pickupType: pickupByKarix ? "KarixPersonal" : "Courier",
      paymentMethod: paymentMethod, 
      couponCode: appliedCoupon?.code || null 
    };

    try {
      const response = await fetch("https://api.karixcomputers.ro/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
        credentials: "include", 
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Eroare la procesarea comenzii.");
      
      if (paymentMethod === "online") {
        const paymentResponse = await fetch(`https://api.karixcomputers.ro/api/payments/netopia/pay/${data.orderId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` }
        });

        const paymentData = await paymentResponse.json();
        if (!paymentResponse.ok) throw new Error(paymentData.error || "Eroare la inițierea plății Netopia. Te rugăm să reîncerci.");

        const form = document.createElement("form");
        form.setAttribute("method", "POST");
        form.setAttribute("action", paymentData.paymentUrl);

        const envKeyInput = document.createElement("input");
        envKeyInput.setAttribute("type", "hidden");
        envKeyInput.setAttribute("name", "env_key");
        envKeyInput.setAttribute("value", paymentData.env_key);
        form.appendChild(envKeyInput);

        const dataInput = document.createElement("input");
        dataInput.setAttribute("type", "hidden");
        dataInput.setAttribute("name", "data");
        dataInput.setAttribute("value", paymentData.data);
        form.appendChild(dataInput);

        document.body.appendChild(form);
        sessionStorage.setItem("orderJustPlaced", "true");
        form.submit(); 
        return; 
      } else {
        await notifyDiscord(orderData, appliedCoupon);
        if (clearCart) clearCart();
        sessionStorage.setItem("orderJustPlaced", "true");
        nav("/success"); 
      }
      
    } catch (error) {
      triggerError(error.message);
      setLoading(false);
    }
  };

  // Variabilă helper ca să știm când ascundem input-urile cu "Scrie judetul..."
  const hideStandardAddressFields = cartAnalysis.hasService && !isAssemblyOrder && !pickupByKarix && serviceDeliveryMethod === "fanbox" && returnToSameFanbox;

  return (
    <>
      <SEO 
        title="Finalizare Comandă"
        description="Ești la un pas de a deține un sistem Karix sau de a-ți repara echipamentul. Finalizează comanda acum pentru livrare rapidă și suport tehnic de elită."
      />

      {/* Containerul obligatoriu pentru Harta FAN Courier */}
      <div id="fanbox-map-root"></div>

      <div className="min-h-screen pt-32 pb-24 px-4 sm:px-6 relative overflow-hidden bg-transparent text-left font-sans">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <Link to="/cart" className="p-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white backdrop-blur-md transition-all group shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-4xl font-black text-white tracking-tight italic drop-shadow-2xl uppercase">
              Finalizare <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Comandă</span>
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            <div className="lg:col-span-7 space-y-6">
              
              <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em]">1. Date Facturare</h2>
                  
                  <div className="flex p-1 bg-black/20 rounded-xl border border-white/5 w-full sm:w-fit">
                    <button 
                      onClick={handleSwitchToPerson}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!shipping.isCompany ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                      Pers. Fizică
                    </button>
                    <button 
                      onClick={handleSwitchToCompany}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${shipping.isCompany ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                      Firmă (B2B)
                    </button>
                  </div>
                </div>

                {shipping.isCompany && (
                  <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                      <span className="text-amber-400 mt-0.5">ℹ️</span>
                      <p className="text-xs text-amber-400 font-medium leading-relaxed">
                          Conform legislației în vigoare, garanția comercială pentru persoanele juridice este limitată la maxim <strong className="font-black text-white">12 luni</strong> pentru produsele hardware.
                      </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {!shipping.isCompany ? (
                    <>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Nume și Prenume</label>
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder-gray-600 font-medium" 
                          value={shipping.name} 
                          onChange={e => setShipping(s => ({ ...s, name: e.target.value }))} 
                          placeholder="Nume și Prenume complet" 
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Număr de Telefon</label>
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder-gray-600 font-medium" 
                          value={shipping.phone} 
                          onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))} 
                          placeholder="Număr de Telefon de contact" 
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2 md:col-span-2 relative">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">CUI / CIF</label>
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder-gray-600 font-medium" 
                          value={shipping.cui} 
                          onChange={e => setShipping(s => ({ ...s, cui: e.target.value }))} 
                          onBlur={(e) => fetchCompanyData(e.target.value)}
                          placeholder="Introduceți CUI / CIF" 
                        />
                      </div>
                      
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Denumire Societate</label>
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder-gray-600 font-medium" 
                          value={shipping.companyName} 
                          onChange={e => setShipping(s => ({ ...s, companyName: e.target.value }))} 
                          placeholder="Denumire Societate (ex: Karix Tech S.R.L.)" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Nr. Reg. Comerțului</label>
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder-gray-600 font-medium" 
                          value={shipping.regCom} 
                          onChange={e => setShipping(s => ({ ...s, regCom: e.target.value }))} 
                          placeholder="Nr. Reg. Comerțului (ex: J05/123/2026)" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Număr de Telefon (Firmă)</label>
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder-gray-600 font-medium" 
                          value={shipping.phone} 
                          onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))} 
                          placeholder="Număr de Telefon contact" 
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 2. Detalii Livrare / ASAMBLARE */}
              <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] mb-6">
                  {isAssemblyOrder ? "2. Detalii Predare Componente" : "2. Detalii Livrare / Ridicare"}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {isAssemblyOrder ? (
                    // 👉 DESIGN SPECIAL PENTRU ASAMBLARE PC
                    <>
                      <div className="md:col-span-2 mb-4 flex flex-col gap-4">
                        <button type="button" onClick={() => { setPickupByKarix(true); setShipping(prev => ({ ...prev, county: "Bihor", city: "Oradea" })); }} className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left backdrop-blur-md ${pickupByKarix ? "bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-white/5 border-white/5 hover:border-white/10"}`}>
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${pickupByKarix ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-500"}`}>📍</div>
                          <div className="flex-1">
                            <h4 className="text-white font-black text-xs uppercase tracking-wider">Predare Personală Oradea</h4>
                            <p className="text-gray-400 text-[10px]">Ne vedem în Oradea (F2F) ca să ne predai componentele tale.</p>
                          </div>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${pickupByKarix ? "border-indigo-400 bg-indigo-500" : "border-gray-600"}`}>
                            {pickupByKarix && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                          </div>
                        </button>

                        <button type="button" onClick={() => setPickupByKarix(false)} className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left backdrop-blur-md ${!pickupByKarix ? "bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-white/5 border-white/5 hover:border-white/10"}`}>
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${!pickupByKarix ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-500"}`}>🚚</div>
                          <div className="flex-1">
                            <h4 className="text-white font-black text-xs uppercase tracking-wider">Trimit Piesele (Din toată țara)</h4>
                            <p className="text-gray-400 text-[10px]">Comanzi piesele direct la noi la adresă sau le pui tu la curier.</p>
                          </div>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${!pickupByKarix ? "border-indigo-400 bg-indigo-500" : "border-gray-600"}`}>
                            {!pickupByKarix && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                          </div>
                        </button>
                      </div>

                      {pickupByKarix ? (
                         <div className="md:col-span-2 space-y-2 pt-2">
                           <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Detalii Preluare Oradea (Opțional)</label>
                           <textarea 
                             className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all min-h-[60px] resize-none placeholder-gray-600 text-sm" 
                             value={shipping.assemblyNotes} 
                             onChange={e => setShipping(s => ({ ...s, assemblyNotes: e.target.value }))} 
                             placeholder="Ex: Ne vedem la Nufărul / Am și o carcasă foarte mare..." 
                           />
                         </div>
                      ) : (
                        <div className="md:col-span-2 space-y-4 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                           <div>
                              <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-1">Unde trimiți componentele?</h4>
                              <p className="text-white text-sm font-medium leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                                Str. Sovata, Nr. 52, Bl. C6, Ap. 51, Oradea, Bihor<br/>
                                <span className="text-gray-400 text-xs">Telefon destinatar: 0770619935</span>
                              </p>
                           </div>

                           <div className="h-px bg-indigo-500/20 w-full my-4" />

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2 relative" ref={dropdownRef}>
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Județ Retur PC</label>
                                <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all" placeholder="Scrie județul..." value={shipping.county} onFocus={() => setShowJudete(true)} onChange={e => setShipping(s => ({ ...s, county: e.target.value }))} />
                                {showJudete && filteredJudete.length > 0 && (
                                  <div className="absolute z-50 w-full mt-2 bg-[#0f172a]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-3xl max-h-60 overflow-y-auto custom-scrollbar">
                                    {filteredJudete.map(j => (
                                      <button key={j} className="w-full text-left px-5 py-4 text-sm text-gray-300 hover:bg-indigo-600 transition-colors border-b border-white/5 last:border-0" onClick={() => { setShipping(s => ({ ...s, county: j })); setShowJudete(false); }}>{j}</button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Oraș Retur PC</label>
                                <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all" value={shipping.city} onChange={e => setShipping(s => ({ ...s, city: e.target.value }))} placeholder="Orașul tău" />
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Adresa ta (pentru retur PC)</label>
                                <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all min-h-[60px] resize-none placeholder-gray-600 text-sm" value={shipping.addressDetails} onChange={e => setShipping(s => ({ ...s, addressDetails: e.target.value }))} placeholder="Strada, Număr, Bloc... Unde îți trimitem PC-ul gata asamblat?" />
                              </div>
                           </div>

                           <div className="space-y-2 pt-4">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Alte Detalii (Opțional, dar ajută)</label>
                            <textarea 
                              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all min-h-[60px] resize-none placeholder-gray-600 text-sm" 
                              value={shipping.assemblyNotes} 
                              onChange={e => setShipping(s => ({ ...s, assemblyNotes: e.target.value }))} 
                              placeholder="Ex: Am comandat de la eMAG / Trimit azi pachet cu Fan Courier..." 
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // 👉 DESIGN NORMAL PENTRU RESTUL PRODUSELOR
                    <>
                      <div className="md:col-span-2 mb-4">
                        <button type="button" onClick={() => setPickupByKarix(!pickupByKarix)} className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left backdrop-blur-md ${pickupByKarix ? "bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-white/5 border-white/5 hover:border-white/10"}`}>
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${pickupByKarix ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-500"}`}>
                            {cartAnalysis.hasPC ? "🚀" : "🏠"}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-black text-xs uppercase tracking-wider">{pickupLabel}</h4>
                            <p className="text-gray-400 text-[10px]">{pickupDescription}</p>
                          </div>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${pickupByKarix ? "border-indigo-400 bg-indigo-500" : "border-gray-600"}`}>
                            {pickupByKarix && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                          </div>
                        </button>
                      </div>

                      {/* 👉 OPȚIUNI DE EXPEDIERE SERVICE DACA E CAZUL */}
                      {cartAnalysis.hasService && !isAssemblyOrder && !pickupByKarix && (
                        <div className="md:col-span-2 p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4 transition-all">
                           <h4 className="text-white font-black text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                              <span>📦</span> Cum ne trimiți dispozitivul defect?
                           </h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <button 
                                type="button" 
                                onClick={() => setServiceDeliveryMethod("courier")} 
                                className={`p-4 rounded-xl border transition-all text-left ${serviceDeliveryMethod === "courier" ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}
                              >
                                <div className="font-bold text-sm">Curier la Ușă</div>
                                <div className="text-xs opacity-70 mt-1">Curierul vine la adresa ta (+30 RON)</div>
                              </button>
                              
                              <button 
                                type="button" 
                                onClick={() => setServiceDeliveryMethod("fanbox")} 
                                className={`p-4 rounded-xl border transition-all text-left ${serviceDeliveryMethod === "fanbox" ? "bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/20" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}
                              >
                                <div className="font-bold text-sm">Predare la FANbox</div>
                                <div className="text-xs opacity-70 mt-1">Îl lași la locker (+15 RON)</div>
                              </button>
                           </div>

                           {serviceDeliveryMethod === "fanbox" && (
                              <div className="mt-6 p-4 rounded-xl bg-black/40 border border-cyan-500/20 animate-in fade-in zoom-in duration-300">
                                {!selectedFanbox ? (
                                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-left">
                                      <p className="text-cyan-400 font-bold text-sm">Niciun Locker Selectat</p>
                                      <p className="text-gray-400 text-[10px]">Apasă butonul pentru a alege un locker de pe hartă.</p>
                                    </div>
                                    <button type="button" onClick={openFanboxMap} className="bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-[10px] px-4 py-3 rounded-lg transition-colors w-full sm:w-auto">
                                      🗺️ Deschide Harta
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-start gap-4">
                                      <div>
                                        <p className="text-cyan-400 font-black text-xs uppercase tracking-widest mb-1">Locker Selectat ✓</p>
                                        <p className="text-white font-bold text-sm">{selectedFanbox.name}</p>
                                        <p className="text-gray-400 text-xs mt-1">{selectedFanbox.address}</p>
                                      </div>
                                      <button type="button" onClick={openFanboxMap} className="text-cyan-400 hover:text-white text-xs underline font-bold whitespace-nowrap">Modifică</button>
                                    </div>

                                    <div className="h-px bg-white/10 w-full my-2" />
                                    
                                    {/* 👉 Bifa care ascunde/arata campurile vechi de adresa */}
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                      <div className="relative flex items-center justify-center">
                                        <input 
                                          type="checkbox" 
                                          checked={returnToSameFanbox} 
                                          onChange={(e) => setReturnToSameFanbox(e.target.checked)} 
                                          className="sr-only" 
                                        />
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${returnToSameFanbox ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-gray-500 group-hover:border-cyan-400'}`}>
                                          {returnToSameFanbox && <svg width="12" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5L4.5 8.5L13 1" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                        </div>
                                      </div>
                                      <span className="text-gray-300 font-bold text-xs italic">
                                        Vreau ca echipamentul reparat să-mi fie livrat înapoi la acest locker.
                                      </span>
                                    </label>

                                  </div>
                                )}
                                <p className="text-gray-400 text-[10px] mt-4 border-t border-cyan-500/10 pt-3">⚠️ <strong className="text-white">Atenție:</strong> Doar pentru Laptopuri sau Console. Dimensiunea maximă admisă este 45 x 44 x 40 cm.</p>
                              </div>
                           )}
                        </div>
                      )}

                      {/* ASCUNDEM CÂMPURILE DE ADRESĂ DACA CLIENTUL VREA RETUR LA ACELASI FANBOX */}
                      {!hideStandardAddressFields && (
                        <>
                          <div className="space-y-2 relative" ref={dropdownRef}>
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Județ</label>
                            <input className={`w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all ${pickupByKarix ? 'opacity-30 cursor-not-allowed' : ''}`} placeholder="Scrie județul..." value={shipping.county} onFocus={() => !pickupByKarix && setShowJudete(true)} onChange={e => !pickupByKarix && setShipping(s => ({ ...s, county: e.target.value }))} readOnly={pickupByKarix} />
                            {showJudete && !pickupByKarix && filteredJudete.length > 0 && (
                              <div className="absolute z-50 w-full mt-2 bg-[#0f172a]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-3xl max-h-60 overflow-y-auto custom-scrollbar">
                                {filteredJudete.map(j => (
                                  <button key={j} className="w-full text-left px-5 py-4 text-sm text-gray-300 hover:bg-indigo-600 transition-colors border-b border-white/5 last:border-0" onClick={() => { setShipping(s => ({ ...s, county: j })); setShowJudete(false); }}>{j}</button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Oraș</label>
                            <input className={`w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all ${pickupByKarix ? 'opacity-30 cursor-not-allowed' : ''}`} value={shipping.city} onChange={e => !pickupByKarix && setShipping(s => ({ ...s, city: e.target.value }))} placeholder="Orașul tău" readOnly={pickupByKarix} />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Adresă exactă</label>
                            <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all min-h-[80px] resize-none placeholder-gray-600" value={shipping.addressDetails} onChange={e => setShipping(s => ({ ...s, addressDetails: e.target.value }))} placeholder="Strada, Număr, Bloc, Apartament..." />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 3. Metodă de Plată */}
              <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] mb-6">3. Metodă de Plată</h2>
                <div className="flex flex-col gap-4">
                  
                  <button 
                    type="button" 
                    onClick={() => setPaymentMethod("online")}
                    className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left backdrop-blur-md ${paymentMethod === "online" ? "bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-white/5 border-white/5 hover:border-white/10"}`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${paymentMethod === "online" ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-500"}`}>
                      💳
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-black text-xs uppercase tracking-wider">Plată Online cu Cardul</h4>
                      <p className="text-gray-400 text-[10px]">Plată securizată 100% prin Netopia Payments.</p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "online" ? "border-indigo-400 bg-indigo-500" : "border-gray-600"}`}>
                      {paymentMethod === "online" && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                    </div>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setPaymentMethod("transfer_bancar")} 
                    className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left backdrop-blur-md ${paymentMethod === "transfer_bancar" ? "bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-white/5 border-white/5 hover:border-white/10"}`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${paymentMethod === "transfer_bancar" ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-500"}`}>
                      🏦
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-black text-xs uppercase tracking-wider">Transfer Bancar (OP)</h4>
                      <p className="text-gray-400 text-[10px]">Ideal pentru firme. Procesarea începe la confirmarea plății.</p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "transfer_bancar" ? "border-indigo-400 bg-indigo-500" : "border-gray-600"}`}>
                      {paymentMethod === "transfer_bancar" && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                    </div>
                  </button>

                </div>
              </div>

            </div>

            {/* Sumar Comandă Final */}
            <div className="lg:col-span-5">
              <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-2xl sticky top-32 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-8 tracking-tight italic drop-shadow-md text-left uppercase">Sumar Final</h2>
                
                <div className="space-y-4 mb-10">
                  <div className="flex justify-between text-gray-400 font-medium text-sm">
                    <span>Subtotal Produse</span>
                    <span className="text-white font-bold">{formatRON(currentSubtotal)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-400 font-bold text-sm italic">
                      <span>Reducere ({appliedCoupon.code})</span>
                      <span>-{formatRON(discountCents)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-400 font-medium text-sm items-center">
                    <span>{isAssemblyOrder ? "Transport Asamblare" : (cartAnalysis.hasService ? "Transport Retur Service" : "Logistică Hardware")}</span>
                    <span className={`font-black text-[10px] uppercase tracking-widest ${shippingCents === 0 ? "text-emerald-400" : "text-white"}`}>
                      {shippingCents === 0 ? "Gratuit" : `+ ${formatRON(shippingCents)}`}
                    </span>
                  </div>

                  <div className="h-px bg-white/10 w-full my-6" />
                  
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Plată</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white tracking-tighter drop-shadow-lg">{formatRON(totalCents).split(' ')[0]}</span>
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">RON</span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                    <div className="relative flex items-center mt-0.5">
                      <input 
                        type="checkbox" 
                        required 
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="peer h-5 w-5 shrink-0 appearance-none rounded-md border-2 border-white/20 bg-transparent checked:border-indigo-500 checked:bg-indigo-500 focus:outline-none transition-all"
                      />
                      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium leading-relaxed italic uppercase tracking-wider">
                      Am citit și sunt de acord cu <Link to="/terms" target="_blank" className="text-white hover:text-indigo-300 font-black underline">Termenii și Condițiile</Link> și <Link to="/confidentialitate" target="_blank" className="text-white hover:text-indigo-300 font-black underline">Politica GDPR</Link>. Înțeleg că plasarea comenzii implică o obligație de plată.
                    </span>
                  </label>
                </div>

                <button 
                  onClick={handlePlaceOrder} 
                  disabled={loading || items.length === 0} 
                  className="group relative w-full py-6 rounded-[25px] font-black text-white overflow-hidden transition-all active:scale-[0.98] shadow-2xl disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 group-hover:scale-105 transition-transform duration-500" />
                  <span className="relative z-10 text-lg uppercase tracking-widest italic drop-shadow-md">
                    {loading 
                      ? "Se procesează..." 
                      : (paymentMethod === "online" ? "Plătește Acum →" : "Plasează Comanda →")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {errorToastOpen && (
        <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-right duration-300">
          <div className="rounded-3xl border border-pink-500/30 bg-[#1a2236]/90 p-6 shadow-3xl flex items-center gap-5 backdrop-blur-2xl">
            <div className="h-12 w-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-xl font-bold text-pink-400 shadow-lg">!</div>
            <div className="flex-1 text-sm font-bold text-white drop-shadow-md">{errorToastMsg}</div>
            <button onClick={() => setErrorToastOpen(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </>
  );
}