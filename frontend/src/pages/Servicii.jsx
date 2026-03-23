import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx"; 
import { formatRON } from "../utils/money"; 
import { apiFetch } from "../api/client"; 

export default function Servicii() {
  const { addItem } = useCart(); 
  const [services, setServices] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await apiFetch("/products");
        
        if (res.ok) {
          const data = await res.json();
          
          const onlyServices = data.filter(p => 
            p.category === "service" || 
            p.name.toLowerCase().includes("mentenanta") || 
            p.name.toLowerCase().includes("diagnosticare") ||
            p.name.toLowerCase().includes("service")
          );
          
          setServices(onlyServices);
        }
      } catch (err) {
        console.error("Eroare la încărcarea serviciilor:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const handleAddToCart = (service) => {
    addItem({
      id: service.id,
      name: service.name,
      priceCents: service.priceCents, 
      image: service.images?.[0] || null, 
      category: 'service'
    });

    const id = Date.now(); 
    setToasts((prev) => [...prev, { id, message: `Ai adăugat "${service.name}" în coș!` }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    /* Modificat: bg-[#0b1020] eliminat pentru a lăsa animația globală să se vadă */
    <div className="min-h-screen text-gray-200 relative pt-32 pb-24 px-4 overflow-hidden bg-transparent">
      
      {/* Glow discret peste animație pentru a scoate conținutul în evidență */}
      <div className="absolute top-20 left-10 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className="text-center mb-16 md:mb-20">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-2xl uppercase italic">
            Karix <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Services</span>
          </h1>
          <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto italic font-medium px-4 drop-shadow-md">
            Sistemul tău merită tratament de top. Comandă un serviciu și <span className="text-indigo-400">venim noi să ridicăm echipamentul.</span>
          </p>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-20 opacity-50 bg-white/5 backdrop-blur-md rounded-[40px] border border-white/5">
            <p className="italic">Momentan nu sunt servicii disponibile în catalog.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {services.map((service) => (
              <div 
                key={service.id}
                /* Modificat: Background semi-transparent cu blur pentru efectul de sticlă */
                className="flex flex-col p-8 rounded-[32px] bg-white/5 border border-white/10 hover:border-indigo-500/40 transition-all duration-500 group backdrop-blur-md relative overflow-hidden text-center shadow-2xl"
              >
                <div className="h-32 w-32 rounded-2xl flex items-center justify-center mb-6 border bg-white/5 border-white/10 overflow-hidden transition-transform duration-300 group-hover:scale-110 mx-auto shadow-inner">
                  {service.images && service.images[0] ? (
                    <img 
                      src={service.images[0]} 
                      alt={service.name} 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <span className="text-5xl">🛠️</span>
                  )}
                </div>
                
                <h3 className="text-2xl font-black text-white mb-3 tracking-tight italic uppercase drop-shadow-md">{service.name}</h3>
                <p className="text-gray-300 text-[14px] leading-relaxed mb-6 font-medium">
                  {service.description || "Echipamentul tău va fi preluat de curier și adus în laboratorul Karix pentru intervenție profesională."}
                </p>
                
                <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between">
                  <div className="flex flex-col text-left">
                     <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Preț Serviciu</span>
                     <span className="text-2xl font-black text-white italic">{formatRON(service.priceCents)}</span>
                  </div>
                  
                  <button 
                    onClick={() => handleAddToCart(service)}
                    className="px-6 py-3 rounded-2xl bg-indigo-500 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 transition-all active:scale-95"
                  >
                    Adaugă
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-20 p-8 md:p-12 rounded-[40px] bg-white/5 border border-white/10 text-center max-w-4xl mx-auto backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              <div className="text-5xl animate-bounce drop-shadow-lg">🚚</div>
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">Procesul Door-to-Door Karix</h3>
                <p className="text-gray-300 font-medium leading-relaxed text-sm md:text-base">
                    După plasarea comenzii, vom trimite un curier la ușa ta în 24-48h. Tu doar ambalează produsul, de restul ne ocupăm noi. Diagnosticarea și reparația se fac în laboratorul nostru specializat.
                </p>
              </div>
          </div>
        </div>

      </div>

      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 text-white px-6 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl animate-in slide-in-from-right-full">
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}