import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx"; 
import { useAuth } from "../context/AuthContext.jsx"; 
import { formatRON } from "../utils/money"; 
import { apiFetch } from "../api/client"; 
import SEO from "../components/SEO";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"; 

export default function Servicii() {
  const { addItem } = useCart(); 
  const { user, accessToken } = useAuth(); 
  const nav = useNavigate(); 
  
  const [services, setServices] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // State pentru filtru de locație
  const [locationFilter, setLocationFilter] = useState("all"); 

  const [isReordering, setIsReordering] = useState(false);
  const [reorderList, setReorderList] = useState([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const getImageUrl = (img) => {
    if (!img) return null;
    if (img.startsWith("http")) return img;
    return `https://karixcomputers.ro/api/uploads/${img}`;
  };

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

  useEffect(() => {
    fetchServices();
  }, []);

  const filteredServices = services.filter(service => {
      if (locationFilter === 'all') return true;
      if (locationFilter === 'national') return service.isNationalService === true;
      if (locationFilter === 'oradea') return !service.isNationalService; 
      return true;
  });

  const handleAddToCart = (e, service) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    addItem({
      id: service.id,
      productName: service.name, 
      priceCents: service.priceCents, 
      image: getImageUrl(service.images?.[0]), 
      category: 'service',
      isNationalService: service.isNationalService 
    });

    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, message: "Serviciul a fost adăugat în coș!" }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 3000);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(reorderList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setReorderList(items);
  };

  const toggleReorderMode = () => {
    if (!isReordering) {
      setLocationFilter("all"); 
      setReorderList([...services]); 
    }
    setIsReordering(!isReordering);
  };

  const saveNewOrder = async () => {
    setIsSavingOrder(true);
    const updatedItems = reorderList.map((item, index) => ({
      id: item.id,
      sortOrder: index
    }));

    try {
      const res = await fetch("https://api.karixcomputers.ro/api/products/reorder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ items: updatedItems })
      });

      if (res.ok) {
        const toastId = Date.now();
        setToasts((prev) => [...prev, { id: toastId, message: "Ordinea a fost salvată cu succes!" }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 3000);
        setIsReordering(false);
        fetchServices(); 
      } else {
        const data = await res.json();
        throw new Error(data.error || "Eroare la salvare.");
      }
    } catch (err) {
      alert("A apărut o eroare: " + err.message);
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <>
      <SEO 
        title="Service & Mentenanță PC, Laptop, Console" 
        description="Reparații profesionale în Oradea și național. Curățare praf, asamblare calculatoare, diagnosticare și optimizare. Servicii premium cu acoperire selectivă."
      />

      <div className="min-h-screen text-gray-200 relative pt-32 pb-24 px-4 overflow-hidden bg-transparent">
        
        <div className="max-w-6xl mx-auto relative z-10">
          
          <div className="text-center mb-10 md:mb-16">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-2xl uppercase italic text-center">
              Karix <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Services</span>
            </h1>
            <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto italic font-medium px-4 drop-shadow-md text-center mb-10">
              Sistemul tău merită tratament de top. Alege serviciul dorit.
            </p>

            {!isReordering && services.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button 
                        onClick={() => setLocationFilter('all')} 
                        className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg border ${locationFilter === 'all' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                        Toate Serviciile
                    </button>
                    <button 
                        onClick={() => setLocationFilter('oradea')} 
                        className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg border flex items-center gap-2 ${locationFilter === 'oradea' ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                        📍 Doar Oradea
                    </button>
                    <button 
                        onClick={() => setLocationFilter('national')} 
                        className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg border flex items-center gap-2 ${locationFilter === 'national' ? 'bg-pink-600 text-white border-pink-500 shadow-pink-600/20' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                        🚚 Toată Țara
                    </button>
                </div>
            )}
          </div>

          {user?.role === "admin" && (
            <div className="flex justify-center mb-12">
              <button 
                onClick={toggleReorderMode}
                className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center gap-3 ${isReordering ? 'bg-amber-500 text-black shadow-amber-500/20' : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:scale-105'}`}
              >
                <span>{isReordering ? "✕ Anulează Editarea" : "✏️ Editează Ordinea Serviciilor"}</span>
              </button>
            </div>
          )}

          {isReordering ? (
            <div className="bg-[#12192b] border border-white/10 p-8 rounded-[40px] shadow-2xl max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-amber-400 italic uppercase">Reordonare Servicii</h2>
                  <p className="text-xs text-gray-400 font-medium">Trage serviciile în sus sau în jos pentru a le schimba poziția pe site.</p>
                </div>
                <button 
                  onClick={saveNewOrder} 
                  disabled={isSavingOrder}
                  className="px-8 py-4 rounded-2xl bg-amber-500 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50 transition-all"
                >
                  {isSavingOrder ? "Se salvează..." : "✓ Salvează Ordinea"}
                </button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="services-list">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-4">
                      {reorderList.map((service, index) => (
                        <Draggable key={service.id} draggableId={service.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={provided.draggableProps.style}
                              className={`flex items-center gap-6 p-4 rounded-2xl border transition-all ${snapshot.isDragging ? 'bg-amber-500/20 border-amber-500 shadow-2xl' : 'bg-[#0b1020] border-white/10 hover:border-white/30'}`}
                            >
                              <div className="text-gray-500 text-2xl cursor-grab active:cursor-grabbing px-2">≡</div>
                              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-black text-white/50">{index + 1}</div>
                              <div className="w-16 h-16 rounded-xl flex items-center justify-center border bg-white/5 border-white/10 overflow-hidden">
                                {service.images && service.images[0] ? (
                                  <img src={getImageUrl(service.images[0])} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-2xl">🛠️</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-white uppercase italic tracking-tight">{service.name}</h3>
                                    {service.isNationalService ? (
                                        <span className="text-[8px] bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-pink-500/30">Național</span>
                                    ) : (
                                        <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-indigo-500/30">Oradea</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">{formatRON(service.priceCents)}</p>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

          ) : (
            
            filteredServices.length === 0 ? (
              <div className="text-center py-20 opacity-50 bg-white/5 backdrop-blur-md rounded-[40px] border border-white/5">
                <p className="italic">Nu am găsit servicii pentru acest filtru.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {filteredServices.map((service) => (
                  <div 
                    key={service.id}
                    className="flex flex-col p-8 rounded-[32px] bg-white/5 border border-white/10 hover:border-indigo-500/40 transition-all duration-500 group backdrop-blur-md relative overflow-hidden text-center shadow-2xl"
                  >
                    <div className="absolute top-4 left-4 z-20">
                        {service.isNationalService ? (
                            <span className="px-3 py-1.5 rounded-xl bg-pink-500/20 backdrop-blur-md text-pink-400 text-[8px] font-black uppercase tracking-widest border border-pink-500/30 flex items-center gap-1 shadow-lg">
                                🚚 Toată Țara
                            </span>
                        ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-indigo-500/20 backdrop-blur-md text-indigo-300 text-[8px] font-black uppercase tracking-widest border border-indigo-500/30 flex items-center gap-1 shadow-lg">
                                📍 Doar Oradea
                            </span>
                        )}
                    </div>

                    {/* Dăm click pe poză sau titlu ca să mergem la detalii */}
                    <div 
                      onClick={() => nav(`/service/${service.id}`)}
                      className="cursor-pointer"
                    >
                      <div className="h-32 w-32 rounded-2xl flex items-center justify-center mb-6 border bg-white/5 border-white/10 overflow-hidden transition-transform duration-300 group-hover:scale-110 mx-auto shadow-inner mt-4">
                        {service.images && service.images[0] ? (
                          <img 
                            src={getImageUrl(service.images[0])} 
                            alt={service.name} 
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <span className="text-5xl">🛠️</span>
                        )}
                      </div>
                      
                      <h3 className="text-2xl font-black text-white mb-3 tracking-tight italic uppercase drop-shadow-md group-hover:text-indigo-400 transition-colors">
                        {service.name}
                      </h3>
                    </div>

                    {/* 👉 AM SCOS CLASA line-clamp-3 AICI CA SĂ SE VADĂ TOATĂ DESCRIEREA SCURTĂ */}
                    <p className="text-gray-300 text-[14px] leading-relaxed mb-6 font-medium">
                      {service.description || "Asigurăm asistență și reparații profesionale la standarde înalte."}
                    </p>
                    
                    <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-4">
                      <div className="flex justify-between items-center w-full px-2">
                         <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Preț:</span>
                         <span className="text-2xl font-black text-white italic">{formatRON(service.priceCents)}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full">
                          <button 
                            onClick={() => nav(`/service/${service.id}`)}
                            className="flex-1 px-4 py-3 rounded-2xl bg-white/5 text-white border border-white/10 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
                          >
                            Detalii
                          </button>
                          
                          <button 
                            onClick={(e) => handleAddToCart(e, service)}
                            className="flex-1 px-4 py-3 rounded-2xl bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 hover:shadow-indigo-500/40 transition-all active:scale-95"
                          >
                            Adaugă
                          </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          <div className="mt-20 flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="p-8 md:p-12 rounded-[40px] bg-gradient-to-br from-indigo-900/40 to-[#0b1020] border border-indigo-500/30 text-center md:text-left backdrop-blur-xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700 pointer-events-none" />
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 relative z-10">
                <div className="text-6xl drop-shadow-xl animate-in zoom-in duration-500">📍</div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">
                    Asistență locală sau <span className="text-pink-400">Națională</span>
                  </h3>
                  <p className="text-gray-300 font-medium leading-relaxed text-sm md:text-base">
                    Anumite servicii (precum mentenanța hardware complexă și asamblarea) sunt disponibile <strong>exclusiv în Oradea / Județul Bihor</strong> pentru a garanta calitatea preluării și a predării. Pentru restul serviciilor (precum consultanța, diagnosticarea remote sau anumite intervenții software), suntem disponibili <strong>pentru toată țara</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-10 right-4 md:right-10 flex flex-col gap-3 z-[100] pointer-events-none">
          {toasts.map((toast) => (
            <div key={toast.id} className="toast-card flex items-center gap-4 bg-[#1a2236]/90 border border-emerald-500/30 p-4 sm:p-5 rounded-3xl shadow-2xl backdrop-blur-2xl pointer-events-auto animate-in slide-in-from-right duration-300">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-xl font-bold text-emerald-400 shadow-lg">✓</div>
              <p className="text-white font-bold text-xs sm:text-sm drop-shadow-md pr-4">{toast.message}</p>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}