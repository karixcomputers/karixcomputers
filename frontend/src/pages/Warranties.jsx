import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMyOrders } from "../api/orders"; 
import { apiFetch } from "../api/client"; 
import { useAuth } from "../context/AuthContext.jsx";

// Componentă pentru Statusul de Service (bazat pe fluxul tău: laborator, curier, etc.)
function ServiceStatusBadge({ status }) {
  const map = {
    in_asteptare: { label: "În așteptare", color: "text-amber-400 border-amber-500/20 bg-amber-500/5", icon: "⏳" },
    preluat_curier: { label: "Preluat Curier", color: "text-blue-400 border-blue-500/20 bg-blue-500/5", icon: "🚚" },
    in_laborator: { label: "În laborator", color: "text-purple-400 border-purple-500/20 bg-purple-500/5", icon: "🔬" },
    finalizat: { label: "Finalizat (Gata de livrare)", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", icon: "✨" },
    predat_curier: { label: "Predat la Curier", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5", icon: "📦" },
    livrat: { label: "Livrat", color: "text-gray-400 border-white/10 bg-white/5", icon: "✅" },
  };

  const config = map[status] || { label: status, color: "text-gray-400 border-white/5 bg-white/5", icon: "•" };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-black uppercase text-[10px] tracking-widest backdrop-blur-md shadow-lg ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}

export default function Warranties() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active_warranties"); 

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["myOrders"],
    queryFn: fetchMyOrders,
  });

  const { data: serviceRequests, isLoading: serviceLoading } = useQuery({
    queryKey: ["myServiceRequests"],
    queryFn: async () => {
        const res = await apiFetch("/api/service-orders/my-requests");
        return res.json();
    },
    enabled: !!user
  });

  // LOGICĂ SEPARARE CERERI SERVICE (Active vs Istoric/Livrate)
  const serviceData = useMemo(() => {
    if (!serviceRequests) return { active: [], history: [] };
    return {
      active: serviceRequests.filter(r => r.status !== 'livrat'),
      history: serviceRequests.filter(r => r.status === 'livrat')
    };
  }, [serviceRequests]);

  const warranties = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    let results = [];
    const SERVICE_KEYWORDS = ['mentenanta', 'service', 'diagnosticare', 'curatare', 'montaj', 'reparatie'];

    orders.forEach(order => {
      const finalizedReturnedProducts = (order.returnRequests || [])
        .filter(req => req.status === 'completat')
        .flatMap(req => req.returnedItems || []);

      if (order.status === 'livrat') {
        order.items.forEach(item => {
          const nameStr = (item.productName || "").toLowerCase();
          const isService = item.category === 'service' || SERVICE_KEYWORDS.some(kw => nameStr.includes(kw));

          if (!isService) {
            const months = item.warrantyMonths || 24; 
            const isReturned = finalizedReturnedProducts.includes(item.productName);
            const purchaseDate = new Date(order.createdAt);
            const expiryDate = new Date(order.createdAt);
            expiryDate.setMonth(expiryDate.getMonth() + months);
            const isExpired = new Date() > expiryDate;

            results.push({
              id: `WR-${String(item.id).slice(-4).toUpperCase()}`,
              orderRef: String(order.id).slice(-6).toUpperCase(),
              product: item.productName,
              purchaseDate,
              expiryDate,
              status: isReturned ? "Produs Returnat" : (isExpired ? "Expirată" : "Activă"),
              isReturned,
              duration: `${months} Luni`
            });
          }
        });
      }
    });
    return results;
  }, [orders]);

  if (ordersLoading || serviceLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent text-left">
      <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-12">
          <h1 className="text-5xl font-black text-white tracking-tighter mb-4 italic drop-shadow-2xl">
            Service & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Garanții</span>
          </h1>
          
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-fit backdrop-blur-md">
            <button 
              onClick={() => setActiveTab("active_warranties")}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active_warranties' ? 'bg-white text-[#0b1020] shadow-xl' : 'text-gray-500 hover:text-white'}`}
            >
              🛡️ Produse Asigurate
            </button>
            <button 
              onClick={() => setActiveTab("service_requests")}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'service_requests' ? 'bg-white text-[#0b1020] shadow-xl' : 'text-gray-500 hover:text-white'}`}
            >
              🔬 Cereri Service ({serviceRequests?.length || 0})
            </button>
          </div>
        </header>

        {/* TAB 1: GARANȚII ACTIVE */}
        {activeTab === "active_warranties" && (
          <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {warranties.length > 0 ? (
              warranties.map((w, idx) => (
                <div key={idx} className={`group relative p-[1px] rounded-[35px] bg-gradient-to-br transition-all duration-500 shadow-2xl ${w.isReturned ? 'from-white/5 grayscale opacity-60' : 'from-white/10 hover:from-indigo-500/30'}`}>
                  <div className="p-8 md:p-10 rounded-[34px] bg-[#0b1020]/70 backdrop-blur-3xl flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex items-center gap-6">
                        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-2xl border shadow-inner ${w.isReturned ? 'bg-white/5' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                          {w.isReturned ? '📦' : '🛡️'}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-3 mb-1">
                            <h3 className={`text-xl font-black italic uppercase tracking-tight ${w.isReturned ? 'text-gray-500 line-through' : 'text-white'}`}>{w.product}</h3>
                            
                            {/* LOGICA NOUĂ: TEXT "PRODUS RETURNAT" LÂNGĂ NUME */}
                            {w.isReturned && (
                              <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[8px] font-black uppercase tracking-[0.2em] italic shadow-lg">
                                Produs Returnat
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ID: {w.id} • GARANȚIE: {w.duration}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Dată Expirare</p>
                        <p className={`text-lg font-black italic ${w.isReturned ? 'text-gray-500' : 'text-white'}`}>{w.expiryDate.toLocaleDateString('ro-RO')}</p>
                      </div>
                    </div>
                    {w.status === 'Activă' && !w.isReturned && (
                      <button onClick={() => navigate("/service-request", { state: { product: w.product, warrantyId: w.id } })} className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white hover:text-[#0b1020] transition-all italic">
                        Solicită intervenție service 🛠️
                      </button>
                    )}
                    {w.isReturned && (
                      <div className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-500 font-black uppercase text-[9px] tracking-widest text-center italic opacity-50">
                        Garanție închisă automat în urma returului
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              // MESAJ CÂND NU EXISTĂ GARANȚII ACTIVE
              <div className="p-10 rounded-[30px] border border-white/5 bg-white/[0.02] text-center text-gray-600 italic text-xs">
                Nu ai niciun produs asigurat înregistrat în contul tău.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ISTORIC SERVICE */}
        {activeTab === "service_requests" && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* SECȚIUNEA 1: CERERI ACTIVE */}
            <section className="space-y-6">
              <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] ml-4 flex items-center gap-3">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                Intervenții Active
              </h2>
              {serviceData.active.length > 0 ? (
                serviceData.active.map((req) => (
                  <div key={req.id} className="group relative p-[1px] rounded-[35px] bg-gradient-to-br from-white/10 to-transparent shadow-2xl">
                    <div className="p-8 rounded-[34px] bg-[#0b1020]/80 backdrop-blur-3xl">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">🛠️</div>
                            <div>
                              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Fișă Service #{req.id.slice(-6).toUpperCase()}</div>
                              <h3 className="text-lg font-black text-white italic uppercase tracking-tight">{req.productName}</h3>
                            </div>
                          </div>
                          <div className="p-4 rounded-2xl bg-black/20 border border-white/5 text-[11px] text-gray-400 italic">"{req.issueDescription}"</div>
                        </div>
                        <div className="flex flex-col items-start md:items-end justify-between gap-6">
                          <ServiceStatusBadge status={req.status} />
                          <div className="text-right">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Data Înregistrării</p>
                            <p className="text-sm font-bold text-gray-300">{new Date(req.createdAt).toLocaleDateString('ro-RO')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 rounded-[30px] border border-white/5 bg-white/[0.02] text-center text-gray-600 italic text-xs">
                  Nu ai nicio intervenție activă în acest moment.
                </div>
              )}
            </section>

            {/* SECȚIUNEA 2: ISTORIC (LIVRATE) */}
            {serviceData.history.length > 0 && (
              <section className="space-y-6 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] ml-4 flex items-center gap-3">
                  <span className="w-2 h-2 bg-gray-600 rounded-full" />
                  Arhivă Intervenții
                </h2>
                {serviceData.history.map((req) => (
                  <div key={req.id} className="p-8 rounded-[35px] border border-white/5 bg-[#0b1020]/40 flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-sm">✅</div>
                      <div>
                        <h3 className="text-sm font-black text-gray-400 italic uppercase">{req.productName}</h3>
                        <p className="text-[9px] text-gray-600 font-bold uppercase">Reparat la: {new Date(req.updatedAt).toLocaleDateString('ro-RO')}</p>
                      </div>
                    </div>
                    <ServiceStatusBadge status={req.status} />
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}