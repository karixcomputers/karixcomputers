import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { formatRON } from "../utils/money";
import { apiFetch } from "../api/client";
import SEO from "../components/SEO";

export default function ServiceDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { addItem } = useCart();
  
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await apiFetch(`/products/${id}`);
        if (!res.ok) throw new Error("Serviciul nu a fost găsit.");
        const data = await res.json();
        setService(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [id]);

  const getImageUrl = (img) => {
    if (!img) return null;
    if (img.startsWith("http")) return img;
    return `https://karixcomputers.ro/api/uploads/${img}`;
  };

  const handleAddToCart = () => {
    addItem({
      id: service.id,
      productName: service.name,
      priceCents: service.priceCents,
      image: getImageUrl(service.images?.[0]),
      category: 'service',
      isNationalService: service.isNationalService
    });

    setToast("Serviciul a fost adăugat în coș!");
    setTimeout(() => setToast(""), 3000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  );

  if (error || !service) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-4xl font-black text-white uppercase italic mb-4">Eroare</h1>
      <p className="text-gray-400 mb-8">{error || "Acest serviciu nu mai este disponibil."}</p>
      <button onClick={() => nav("/servicii")} className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest">
        ← Înapoi la Servicii
      </button>
    </div>
  );

  return (
    <>
      <SEO 
        title={`${service.name} - Karix Services`} 
        description={service.description || "Detalii despre serviciul selectat."}
      />

      <div className="min-h-screen pt-32 pb-24 px-4 md:px-8 bg-transparent text-left font-sans">
        <div className="max-w-5xl mx-auto relative z-10">
          
          <button 
            onClick={() => nav("/servicii")}
            className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            ← Înapoi la Servicii
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-white/5 border border-white/10 rounded-[40px] p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
            
            {/* STÂNGA: Imagine / Iconiță */}
            <div className="lg:col-span-5 flex flex-col justify-center items-center">
              <div className="w-full aspect-square max-w-sm rounded-[32px] bg-[#0b1020]/50 border border-white/10 flex items-center justify-center overflow-hidden relative shadow-inner">
                {service.images && service.images[0] ? (
                  <img 
                    src={getImageUrl(service.images[0])} 
                    alt={service.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-8xl drop-shadow-2xl">🛠️</span>
                )}
                
                {/* Badge Locație pe Imagine */}
                <div className="absolute top-4 left-4">
                  {service.isNationalService ? (
                    <span className="px-4 py-2 rounded-xl bg-pink-500/20 backdrop-blur-md text-pink-400 text-[10px] font-black uppercase tracking-widest border border-pink-500/30 flex items-center gap-2 shadow-lg">
                      🚚 Disponibil Național
                    </span>
                  ) : (
                    <span className="px-4 py-2 rounded-xl bg-indigo-500/20 backdrop-blur-md text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30 flex items-center gap-2 shadow-lg">
                      📍 Exclusiv Oradea
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* DREAPTA: Detalii și Acțiuni */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              
              <div className="mb-6">
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight italic uppercase drop-shadow-md mb-4 leading-tight">
                  {service.name}
                </h1>
                <div className="flex items-end gap-3 text-indigo-400">
                  <span className="text-4xl sm:text-5xl font-black tracking-tighter italic">{formatRON(service.priceCents).split(' ')[0]}</span>
                  <span className="text-sm font-black uppercase tracking-widest mb-1 sm:mb-2">RON</span>
                </div>
              </div>

              <div className="w-full h-px bg-white/10 my-6" />

              <div className="prose prose-invert prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-white max-w-none mb-8">
                <p className="whitespace-pre-line text-sm sm:text-base">
                {service.longDescription || service.description || "Acest serviciu este executat de tehnicienii noștri cu experiență, folosind echipamente profesionale și materiale premium."}
                </p>
              </div>

              {/* Info Logistică (Foarte important pentru clienți) */}
              <div className="mb-8 p-5 rounded-2xl bg-black/20 border border-white/5 space-y-3">
                <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-2">
                  <span>ℹ️</span> Cum se desfășoară?
                </h4>
                {service.isNationalService ? (
                  <p className="text-xs text-gray-300 font-medium leading-relaxed">
                    Dacă nu ești din Oradea, vei trimite echipamentul defect prin curier (tur-retur). Adaugi serviciul în coș, alegi curierul, iar de restul ne ocupăm noi! Plata se face după diagnosticare sau în avans, în funcție de preferințe.
                  </p>
                ) : (
                  <p className="text-xs text-gray-300 font-medium leading-relaxed">
                    Acest serviciu presupune intervenții hardware complexe ce nu suportă transportul prin curierat. Serviciul este valabil doar cu predare personală în Oradea / Județul Bihor.
                  </p>
                )}
              </div>

              <button 
                onClick={handleAddToCart}
                className="w-full sm:w-auto py-5 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
              >
                Adaugă Serviciul În Coș
              </button>

            </div>
          </div>

        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-right duration-300">
          <div className="rounded-3xl border border-emerald-500/30 bg-[#1a2236]/90 p-5 shadow-2xl flex items-center gap-4 backdrop-blur-2xl">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-lg font-bold text-emerald-400">✓</div>
            <div className="text-sm font-bold text-white pr-4">{toast}</div>
          </div>
        </div>
      )}
    </>
  );
}