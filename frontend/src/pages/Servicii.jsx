import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx"; 
import { useAuth } from "../context/AuthContext.jsx"; // 👉 NOU: Pentru verificarea adminului
import { formatRON } from "../utils/money"; 
import { apiFetch } from "../api/client"; 
import SEO from "../components/SEO";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"; // 👉 NOU

export default function Servicii() {
  const { addItem } = useCart(); 
  const { user, accessToken } = useAuth(); // 👉 NOU
  
  const [services, setServices] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // --- STATE-URI PENTRU REORDONARE DRAG & DROP (ADMIN) ---
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

  const handleAddToCart = (service) => {
    const success = addItem({
      id: service.id,
      productName: service.name, 
      priceCents: service.priceCents, 
      image: getImageUrl(service.images?.[0]), 
      category: 'service'
    });

    if (success === false) return;

    const id = Date.now(); 
    setToasts((prev) => [...prev, { id, message: `Ai adăugat "${service.name}" în coș!` }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  // 👉 NOU: Logica de Drag & Drop
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(reorderList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setReorderList(items);
  };

  const toggleReorderMode = () => {
    if (!isReordering) {
      setReorderList([...services]); 
    }
    setIsReordering(!isReordering);
  };

  const saveNewOrder = async () => {
    setIsSavingOrder(true);
    // Pregătim payload-ul: [{ id: "123", sortOrder: 0 }, { id: "456", sortOrder: 1 }]
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
        fetchServices(); // Reîncărcăm lista de pe server cu noua ordine
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
        description="Reparații profesionale în Oradea: Curățare praf și schimbare pastă termică PC/Laptop, asamblare calculatoare, reparații console și stick drift controllere. Ridicare și livrare la domiciliu!"
      />

      <div className="min-h-screen text-gray-200 relative pt-32 pb-24 px-4 overflow-hidden bg-transparent">
        
        <div className="max-w-6xl mx-auto relative z-10">
          
          <div className="text-center mb-10 md:mb-16">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-2xl uppercase italic text-center">
              Karix <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Services</span>
            </h1>
            <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto italic font-medium px-4 drop-shadow-md text-center">
              Sistemul tău merită tratament de top. Comandă un serviciu și <span className="text-indigo-400">venim noi să ridicăm echipamentul.</span>
            </p>
          </div>

          {/* 👉 NOU: Buton Reordonare (Doar Admin) */}
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

          {/* --- CONȚINUT: LISTĂ DRAG&DROP SAU GRILĂ NORMALĂ --- */}
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
                                <h3 className="font-bold text-white uppercase italic tracking-tight">{service.name}</h3>
                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{formatRON(service.priceCents)}</p>
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
            
            services.length === 0 ? (
              <div className="text-center py-20 opacity-50 bg-white/5 backdrop-blur-md rounded-[40px] border border-white/5">
                <p className="italic">Momentan nu sunt servicii disponibile în catalog.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {services.map((service) => (
                  <div 
                    key={service.id}
                    className="flex flex-col p-8 rounded-[32px] bg-white/5 border border-white/10 hover:border-indigo-500/40 transition-all duration-500 group backdrop-blur-md relative overflow-hidden text-center shadow-2xl"
                  >
                    <div className="h-32 w-32 rounded-2xl flex items-center justify-center mb-6 border bg-white/5 border-white/10 overflow-hidden transition-transform duration-300 group-hover:scale-110 mx-auto shadow-inner">
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
            )
          )}

          <div className="mt-20 flex flex-col gap-6 max-w-4xl mx-auto">
            
            {/* Ridicare Oradea */}
            <div className="p-8 md:p-12 rounded-[40px] bg-gradient-to-br from-indigo-900/40 to-[#0b1020] border border-indigo-500/30 text-center md:text-left backdrop-blur-xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700 pointer-events-none" />
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 relative z-10">
                <div className="text-6xl drop-shadow-xl animate-in zoom-in duration-500">🚗</div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">
                    Ești din <span className="text-indigo-400">Oradea</span>? Venim noi la tine!
                  </h3>
                  <p className="text-gray-300 font-medium leading-relaxed text-sm md:text-base">
                    Dacă ești din municipiul Oradea, nu mai trebuie să te complici cu firmele de curierat. Venim personal să ridicăm echipamentul de la domiciliul tău și ți-l aducem înapoi pentru doar <strong className="text-white">30 RON</strong>. Garantăm că în <strong className="text-indigo-400 font-black uppercase tracking-wider">maxim 24 de ore</strong> de la ridicare, device-ul se va întoarce la tine gata de acțiune.
                  </p>
                </div>
              </div>
            </div>

            {/* Door to Door Național */}
            <div className="p-8 md:p-12 rounded-[40px] bg-white/5 border border-white/10 text-center md:text-left backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                  <div className="text-5xl drop-shadow-lg opacity-80 hover:opacity-100 transition-opacity cursor-default">🚚</div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-gray-200 mb-2 uppercase italic tracking-tighter">Procesul Door-to-Door Național</h3>
                    <p className="text-gray-400 font-medium leading-relaxed text-sm">
                        Pentru restul țării, după plasarea comenzii vom trimite un curier la ușa ta în 24-48h. Tu doar ambalează produsul în siguranță, de transport ne ocupăm noi. Diagnosticarea și reparația se fac în laboratorul nostru specializat din Oradea.
                    </p>
                  </div>
              </div>
            </div>

          </div>
        </div>

        {/* TOAST NOTIFICATION */}
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