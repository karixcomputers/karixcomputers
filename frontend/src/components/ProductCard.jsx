import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatRON } from "../utils/money";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

// 👉 FUNCȚIE AJUTĂTOARE MUTATĂ AICI PENTRU A GENERA OPȚIUNILE DE STOCARE
const getStorageOptions = (baseStorage) => {
  const base = baseStorage || "1TB";
  const storageList = [
    { value: "512GB", label: "512 GB NVMe M.2", cost: 0 },
    { value: "1TB", label: "1 TB NVMe M.2", cost: 250 },
    { value: "2TB", label: "2 TB NVMe M.2", cost: 750 },
    { value: "4TB", label: "4 TB NVMe M.2", cost: 2000 }
  ];
  const baseItem = storageList.find(s => s.value === base) || storageList[1];
  const baseCost = baseItem.cost;

  return storageList.filter(s => s.cost >= baseCost).map(s => {
    const diff = s.cost - baseCost;
    return {
      value: s.value,
      label: s.value === base ? `${s.label} (Bază)` : `${s.label} (Upgrade)`,
      extraCents: diff * 100,
      extraText: diff > 0 ? `+${diff} RON` : ""
    };
  });
};

export default function ProductCard({ p, product, availableCases = [] }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isFavorite } = useWishlist();
  const navigate = useNavigate();

  const data = p || product;

  // State-uri
  const [showServicePopup, setShowServicePopup] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState(data?.storageGb || "1TB");
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  if (!data) return null;

  const inStock = (data.stock || 0) > 0;
  const isService = data.category === "service" || 
                    ['mentenanta', 'service', 'curatare', 'reparatie'].some(kw => (data.name || "").toLowerCase().includes(kw));

  // 👉 LOGICĂ ROBUSTĂ PENTRU CARCASE
  let compatArray = [];
  try {
     compatArray = Array.isArray(data.compatibleCases) ? data.compatibleCases : JSON.parse(data.compatibleCases || "[]");
  } catch(e) { compatArray = []; }

  const pcCompatibleCases = availableCases.filter(c => 
    compatArray.some(compatId => String(compatId).trim() === String(c.id).trim())
  );
  
  const activeCaseId = selectedCaseId || (pcCompatibleCases.length > 0 ? pcCompatibleCases[0].id : null);
  
  let selectedCaseObj = null;
  let caseAddedPriceCents = 0;

  // Căutare bazată exclusiv pe String pentru a preveni erorile dropdown-ului
  if (activeCaseId && pcCompatibleCases.length > 0) {
    selectedCaseObj = pcCompatibleCases.find(c => String(c.id).trim() === String(activeCaseId).trim()) || pcCompatibleCases[0];
    caseAddedPriceCents = selectedCaseObj.price || 0;
  }

  // 👉 NOU: Logica pentru a alege ce imagine afișăm (Carcasa selectată SAU sistemul de bază)
  const displayImage = (selectedCaseObj && selectedCaseObj.image && selectedCaseObj.image.trim() !== "") 
    ? selectedCaseObj.image 
    : data.images?.[0];

  // 👉 LOGICĂ PENTRU STOCARE
  const dynamicStorageOptions = getStorageOptions(data.storageGb);
  const currentStorageOption = dynamicStorageOptions.find(opt => opt.value === selectedStorage);
  const storageAddedPriceCents = currentStorageOption ? currentStorageOption.extraCents : 0;

  // 👉 CALCUL PREȚ TOTAL
  const currentPriceCents = (data.priceCents || 0) + storageAddedPriceCents + caseAddedPriceCents;
  const finalStorageText = currentStorageOption ? currentStorageOption.label : selectedStorage;
  
  let finalCaseText = data.case || "N/A";
  if (selectedCaseObj) finalCaseText = selectedCaseObj.name;

  const getImageUrl = (img) => {
    if (!img) return "https://placehold.co/800x500/0b1020/ffffff?text=Karix+PC";
    if (img.startsWith("http")) return img;
    return `https://karixcomputers.ro/uploads/${img}`; // Sau cu api/uploads/ dacă e la fel ca în rest
  };

  const executeAddToCart = () => {
    let finalWarranty = data.warrantyMonths;
    if (finalWarranty === undefined || finalWarranty === null) {
      finalWarranty = isService ? 0 : 24;
    }

    const productToCart = {
      ...data,
      productName: data.name,
      priceCents: currentPriceCents,
      warrantyMonths: Number(finalWarranty),
      // Trimitem și imaginea carcasei în coș, ca să vadă clientul la checkout exact ce a ales
      image: getImageUrl(displayImage),
      specs: {
        cpu: data.cpuBrand,
        gpu: data.gpuBrand,
        motherboard: data.motherboard,
        ram: data.ramGb,
        storage: finalStorageText,
        case: finalCaseText,
        cooler: data.cooler,
        psu: data.psu
      }
    };

    addToCart(productToCart, 1);
  };

  const handleAddToCartClick = (e) => {
    e.preventDefault(); 
    if (isService) {
      setShowServicePopup(true);
    } else {
      executeAddToCart();
    }
  };

  return (
    <>
      <div className="relative flex flex-col rounded-[35px] bg-white/5 border border-white/10 overflow-hidden group hover:border-indigo-500/40 transition-all duration-500 backdrop-blur-md shadow-2xl text-left h-full">
        
        {/* ❤️ BUTON WISHLIST */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(data.id);
          }}
          className={`absolute top-5 right-5 z-30 h-10 w-10 rounded-xl backdrop-blur-xl border flex items-center justify-center transition-all duration-300 active:scale-90 shadow-2xl ${
            isFavorite(data.id)
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
              : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
          }`}
        >
          <span className="text-lg leading-none transition-transform duration-300 group-active:scale-125">
            {isFavorite(data.id) ? '❤️' : '🤍'}
          </span>
        </button>

        {/* ZONA IMAGINE (Stilizată ca în Shop) */}
        <Link to={`/product/${data.id}`} className="block relative h-64 overflow-hidden bg-black/20 shrink-0">
          <div className="absolute top-5 left-5 z-20 flex flex-col gap-2">
            {!isService && (
               <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest shadow-xl">
                 Asamblat la Comandă
               </span>
            )}
            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${
              inStock ? 'bg-white/10 backdrop-blur-md text-white border-white/10' : 'bg-white/5 border-white/10 text-gray-400'
            }`}>
              {isService ? (inStock ? 'Disponibil' : 'Indisponibil') : `🛡️ ${data.warrantyMonths || 24} Luni`}
            </span>
          </div>

          <img
            // 👉 Cheia forțează re-randarea instantanee când se schimbă displayImage
            key={displayImage}
            src={getImageUrl(displayImage)}
            alt={data.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100 animate-in zoom-in-95"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020] via-black/40 to-transparent opacity-90" />
        </Link>

        <div className="p-8 flex-1 flex flex-col">
          <Link to={`/product/${data.id}`} className="block mb-6 relative z-10 -mt-12 group/title">
            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 drop-shadow-md">
              {isService ? 'Serviciu Profesional' : `${data.cpuBrand?.split(' ')[0] || 'Custom'} Edition`}
            </p>
            <h3 className="text-2xl font-black text-white tracking-tight italic uppercase drop-shadow-2xl group-hover/title:text-indigo-400 transition-colors leading-tight line-clamp-2">
              {data.name}
            </h3>
          </Link>

          {/* SPECIFICAȚII ȘI OPȚIUNI (Doar dacă nu e serviciu) */}
          {!isService && (
            <>
              {/* Grilă specificații ca în Shop */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-indigo-400 text-base">⚡</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">CPU</span>
                    <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{data.cpuBrand || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-indigo-400 text-base">🎮</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">GPU</span>
                    <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{data.gpuBrand || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-indigo-400 text-base">📟</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">RAM</span>
                    <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{data.ramGb || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-indigo-400 text-base">🧩</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Placă Bază</span>
                    <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{data.motherboard || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-indigo-400 text-base">❄️</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Cooler</span>
                    <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{data.cooler || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-indigo-400 text-base">🔌</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Sursă</span>
                    <span className="font-bold text-white/90 whitespace-normal break-words text-[11px] leading-tight">{data.psu || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-6">
                {/* 📦 SELECTOR CARCASE TIP DROPDOWN */}
                {pcCompatibleCases.length > 0 && (
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1 flex items-center gap-1.5">
                      <span className="text-indigo-400 text-[10px]">📦</span> Alege Carcasa
                    </label>
                    <div className="relative">
                      <select 
                        value={activeCaseId || ''} 
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                        className="w-full appearance-none bg-[#0b1020] border border-white/10 text-white text-[11px] font-bold py-3 pl-4 pr-10 rounded-xl outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      >
                        {pcCompatibleCases.map(caseOpt => (
                          <option key={caseOpt.id} value={caseOpt.id}>
                            {caseOpt.name} {caseOpt.price > 0 ? `(+${formatRON(caseOpt.price)})` : ''}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* 💾 SELECTOR STOCARE TIP DROPDOWN */}
                {dynamicStorageOptions.length > 0 && (
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1 flex items-center gap-1.5">
                      <span className="text-indigo-400 text-[10px]">💾</span> Memorie Stocare
                    </label>
                    <div className="relative">
                      <select 
                        value={selectedStorage} 
                        onChange={(e) => setSelectedStorage(e.target.value)}
                        className="w-full appearance-none bg-[#0b1020] border border-white/10 text-white text-[11px] font-bold py-3 pl-4 pr-10 rounded-xl outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      >
                        {dynamicStorageOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label} {option.extraText ? `(${option.extraText})` : ''}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {isService && (
            <div className="mb-6">
              <p className="text-sm text-gray-400 italic line-clamp-4">{data.description || "Serviciu profesional pentru echipamentul tău."}</p>
            </div>
          )}

          {/* Preț și Butoane */}
          <div className="mt-auto pt-5 border-t border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-center"> 
              <div className="flex flex-col items-center text-center"> 
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{isService ? 'Preț Manoperă' : 'Preț Sistem'}</span>
                <span className="text-2xl font-black text-white italic">{formatRON(currentPriceCents)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Link to={`/product/${data.id}`} className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg">
                Detalii
              </Link>
              <button disabled={!inStock && currentPriceCents === 0} onClick={handleAddToCartClick} className="flex-1 h-12 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center justify-center font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-indigo-600/20 disabled:opacity-20">
                Adaugă
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP AVERTIZARE SERVICII (A rămas neschimbat) */}
      {showServicePopup && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-xl bg-black/60">
         <div className="relative w-full max-w-md bg-[#161e31]/95 border border-indigo-500/30 p-10 rounded-[40px] text-center shadow-2xl animate-in zoom-in">
           <div className="w-16 h-16 mx-auto bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20">
             <span className="text-3xl">📍</span>
           </div>
           <h2 className="text-2xl font-black text-white mb-3 italic uppercase">Atenție! Serviciu Local</h2>
           <p className="text-gray-400 text-sm mb-6 leading-relaxed">
             Serviciile noastre de mentenanță și asamblare sunt disponibile în prezent doar pentru clienții din <strong className="text-indigo-400">Județul Bihor (Oradea)</strong>. 
           </p>
           <p className="text-xs text-gray-500 mb-8 italic">
             Dacă ești din alt oraș și dorești să ne trimiți echipamentul tău prin curier pe cont propriu, te rugăm să ne contactezi înainte.
           </p>
           <div className="flex flex-col gap-3">
             <button onClick={() => { setShowServicePopup(false); executeAddToCart(); }} className="w-full py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-500 uppercase text-[11px] tracking-widest transition-all shadow-lg active:scale-95">
               Sunt din Oradea / Adaugă în coș
             </button>
             <button onClick={() => { setShowServicePopup(false); navigate("/contact"); }} className="w-full py-4 rounded-2xl font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 uppercase text-[11px] tracking-widest transition-all active:scale-95">
               Contactează-ne (Alte orașe)
             </button>
             <button onClick={() => setShowServicePopup(false)} className="mt-4 text-[10px] text-gray-500 font-bold uppercase hover:text-white transition-colors">
               Anulează
             </button>
           </div>
         </div>
       </div>
      )}
    </>
  );
}