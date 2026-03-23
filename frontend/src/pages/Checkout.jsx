import React, { useState, useMemo, useRef, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { formatRON } from "../utils/money";

const JUDETE = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brașov", "Brăila", "București", 
  "Buzău", "Caraș-Severin", "Călărași", "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", 
  "Giurgiu", "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", 
  "Mureș", "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj", "Sibiu", "Suceava", "Teleorman", "Timiș", 
  "Tulcea", "Vaslui", "Vâlcea", "Vrancea"
];

// --- FUNCȚIE DE PARSARE A ADRESEI ANAF ---
const parseAnafAddress = (rawAddress, judeteList) => {
  if (!rawAddress) return { county: "", city: "", cleanAddress: "" };
  
  let addr = rawAddress.toUpperCase();
  let county = "";
  let city = "";

  // 1. Extragere București (caz special)
  if (addr.includes("BUCUREŞTI") || addr.includes("BUCURESTI")) {
    county = "București";
    city = "București";
    addr = addr.replace(/MUN\.\s*BUCURE[ŞS]TI/g, '').replace(/SECTOR(UL)?\s*\d/g, '').replace(/SEC\.\s*\d/g, '');
  } else {
    // 2. Extragere Județ
    const judMatch = addr.match(/JUD\.\s*([^,]+)/);
    if (judMatch) {
      county = judMatch[1].trim();
      addr = addr.replace(judMatch[0], ''); // Ștergem județul din adresă
    }

    // 3. Extragere Oraș / Localitate
    const cityMatch = addr.match(/(?:MUN\.|OR[ŞS]\.|COM\.|SAT)\s*([^,]+)/);
    if (cityMatch) {
      city = cityMatch[1].trim();
      addr = addr.replace(cityMatch[0], ''); // Ștergem orașul din adresă
    }
  }

  // 4. Curățare rest adresă
  let cleanAddress = addr.replace(/^[,\s]+|[,\s]+$/g, '').replace(/,\s*,/g, ', ').trim();

  const toTitleCase = (str) => {
    if (!str) return "";
    return str.toLowerCase().replace(/(^|\s|-)\S/g, l => l.toUpperCase());
  };

  // 5. Potrivire inteligentă a Județului
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

  // Informația despre metoda de plată
  const paymentMethodInfo = orderData.paymentMethod === "ramburs" ? "💵 Numerar la Livrare (Ramburs)" : "💳 Plată Online (Netopia)";

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
            value: orderData.cartItems.map(item => `• ${item.productName} (x${item.qty})`).join('\n') || "Niciun produs",
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
    regCom: ""
  });

  const [pickupByKarix, setPickupByKarix] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("ramburs"); // NOU: Starea pentru metoda de plată

  const appliedCoupon = location.state?.coupon || null;

  const cartAnalysis = useMemo(() => {
    const isServiceKeywords = ['mentenanta', 'service', 'diagnosticare', 'curatare', 'montaj', 'reparatie'];
    const hasPC = items.some(item => {
      const name = (item.productName || item.name || "").toLowerCase();
      return (item.specs && (item.specs.cpu || item.specs.gpu)) || item.category === 'pc' || !isServiceKeywords.some(kw => name.includes(kw));
    });
    const hasService = items.some(item => {
      const name = (item.productName || item.name || "").toLowerCase();
      return !item.specs && isServiceKeywords.some(kw => name.includes(kw));
    });
    return { hasPC, hasService };
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

  const shippingCents = currentSubtotal >= 500000 || pickupByKarix ? 0 : 2500;
  const totalCents = Math.max(0, currentSubtotal - discountCents + shippingCents);

  const handleSwitchToCompany = () => {
    setShipping(s => ({
      ...s,
      isCompany: true,
      phone: "" 
    }));
  };

  const handleSwitchToPerson = () => {
    setShipping(s => ({
      ...s,
      isCompany: false,
      phone: user?.phone || user?.phoneNumber || s.phone 
    }));
  };

  // --- AUTO-COMPLETARE ANAF + PARSARE + AUTO-BIFARE ORADEA ---
  const fetchCompanyData = async (cuiInput) => {
    const cleanCui = cuiInput.replace(/[^0-9]/g, "");
    if (cleanCui.length < 2) return;

    try {
      const response = await fetch("http://192.168.0.162:4000/api/orders/anaf", {
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

        if (shouldAutoPickup) {
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
    if (!shipping.phone || !shipping.addressDetails || !shipping.city || !shipping.county) {
      triggerError("Te rugăm să completezi toate datele de livrare.");
      return;
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

    if (!accessToken) {
      triggerError("Sesiune expirată. Te rugăm să te reloghezi.");
      return;
    }

    setLoading(true);

    const enrichedItems = items.map(item => {
      const nameStr = (item.productName || item.name || "").toLowerCase();
      const isService = item.category === 'service' || 
                        ['mentenanta', 'service', 'curatare', 'reparatie'].some(kw => nameStr.includes(kw));
      let finalWarranty = (item.warrantyMonths !== undefined && item.warrantyMonths !== null) 
                          ? parseInt(item.warrantyMonths) 
                          : (isService ? 0 : 24);

      return {
        ...item,
        id: item.id,
        productName: item.name || item.productName, 
        qty: parseInt(item.qty || item.quantity || 1),
        priceCentsAtBuy: parseInt(item.priceCents || item.priceCentsAtBuy || 0),
        warrantyMonths: finalWarranty
      };
    });

    const orderData = { 
      client: shipping, 
      cartItems: enrichedItems,
      total: totalCents, 
      userEmail: user?.email, 
      pickupType: pickupByKarix ? "KarixPersonal" : "Courier",
      paymentMethod: paymentMethod, // Trimitem metoda de plată la backend
      couponCode: appliedCoupon?.code || null 
    };

    try {
      const response = await fetch("http://192.168.0.162:4000/api/orders", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${accessToken}` 
        },
        credentials: "include", 
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Eroare la procesarea comenzii.");
      
      await notifyDiscord(orderData, appliedCoupon);

      if (clearCart) clearCart();
      nav("/success"); 
    } catch (error) {
      triggerError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-6 relative overflow-hidden bg-transparent text-left font-sans">
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-pink-500/5 blur-[120px] rounded-full pointer-events-none" />

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
            
            {/* 1. Date de Contact & Tip Facturare */}
            <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em]">1. Date Facturare</h2>
                
                {/* SELECTOR PF / PJ */}
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
                      <span className="absolute right-4 top-11 text-[9px] text-indigo-400 font-black uppercase tracking-widest italic pointer-events-none">
                        (Auto-Fill ANAF)
                      </span>
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

            {/* 2. Detalii Livrare */}
            <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
              <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] mb-6">2. Detalii Livrare / Ridicare</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
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
              </div>
            </div>

            {/* 3. Metodă de Plată (NOU) */}
            <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
              <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] mb-6">3. Metodă de Plată</h2>
              <div className="flex flex-col gap-4">
                
                <button 
                  type="button" 
                  onClick={() => setPaymentMethod("ramburs")} 
                  className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left backdrop-blur-md ${paymentMethod === "ramburs" ? "bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-white/5 border-white/5 hover:border-white/10"}`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${paymentMethod === "ramburs" ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-500"}`}>
                    💵
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-black text-xs uppercase tracking-wider">Numerar la Livrare (Ramburs)</h4>
                    <p className="text-gray-400 text-[10px]">Plătești direct la curier când primești comanda.</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "ramburs" ? "border-indigo-400 bg-indigo-500" : "border-gray-600"}`}>
                    {paymentMethod === "ramburs" && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                  </div>
                </button>

                {/* Aici vom adăuga butonul de Netopia mai târziu, momentan este ascuns sau marcat ca In Curs de Implementare */}
                <button 
                  type="button" 
                  disabled
                  className="w-full p-5 rounded-2xl border-2 bg-black/20 border-white/5 flex items-center gap-4 text-left opacity-50 cursor-not-allowed"
                >
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl bg-white/5 text-gray-500">
                    💳
                  </div>
                  <div className="flex-1">
                    <h4 className="text-gray-400 font-black text-xs uppercase tracking-wider">Plată Online cu Cardul</h4>
                    <p className="text-gray-500 text-[10px]">În curând via Netopia Payments.</p>
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

                <div className="flex justify-between text-gray-400 font-medium text-sm">
                  <span>Logistică</span>
                  <span className={shippingCents === 0 ? "text-emerald-400 font-black text-[10px] uppercase tracking-widest" : "text-white"}>
                    {pickupByKarix ? "Karix Express (Gratuit)" : (shippingCents === 0 ? "Gratuit" : formatRON(shippingCents))}
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

              <button 
                onClick={handlePlaceOrder} 
                disabled={loading || items.length === 0} 
                className="group relative w-full py-6 rounded-[25px] font-black text-white overflow-hidden transition-all active:scale-[0.98] shadow-2xl disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 group-hover:scale-105 transition-transform duration-500" />
                <span className="relative z-10 text-lg uppercase tracking-widest italic drop-shadow-md">
                  {loading ? "Se procesează..." : "Finalizează Comanda →"}
                </span>
              </button>

              <p className="mt-6 text-[9px] text-gray-600 text-center uppercase tracking-widest leading-relaxed">
                Prin finalizarea comenzii, ești de acord cu <Link to="/terms" className="text-gray-400 hover:text-white underline">Termenii și Condițiile</Link> Karix Computers.
              </p>
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
    </div>
  );
}