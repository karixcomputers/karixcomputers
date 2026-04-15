import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Am adăugat isAssembly în state-ul modalului pentru a ști când cerem valoarea asigurată manual
  const [awbModal, setAwbModal] = useState({ open: false, itemId: null, orderId: null, isFanbox: false, isAssembly: false });
  const [packageWeight, setPackageWeight] = useState(1);
  const [packageCount, setPackageCount] = useState(1);
  const [insurance, setInsurance] = useState(false);
  const [declaredValue, setDeclaredValue] = useState(""); // 👉 NOU: Stocăm valoarea PC-ului pentru asamblare
  const [isGenerating, setIsGenerating] = useState(false);

  const [confirmingOpId, setConfirmingOpId] = useState(null);
  
  const [toastMsg, setToastMsg] = useState({ open: false, type: "success", text: "" });
  const [opModal, setOpModal] = useState({ open: false, orderId: null });
  const [cancelModal, setCancelModal] = useState({ open: false, orderId: null });

  const showToast = (text, type = "success") => {
    setToastMsg({ open: true, type, text });
    setTimeout(() => setToastMsg({ open: false, type: "success", text: "" }), 4000);
  };

  const fetchOrders = async () => {
    try {
      const res = await apiFetch("/orders/admin/all");
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.orders || []);
      }
    } catch (err) {
      setError("Eroare la sincronizare.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleUpdateItemStatus = async (orderId, itemId, newStatus, isAssembly) => {
    if (newStatus === "predat_curier" || newStatus === "predat_fanbox") {
      setAwbModal({ open: true, itemId, orderId, isFanbox: newStatus === "predat_fanbox", isAssembly });
      return;
    }
    await executeItemUpdate(orderId, itemId, newStatus);
  };

  const executeItemUpdate = async (orderId, itemId, status, weight = 1, packages = 1, isInsured = false, forceFanbox = false, customDeclaredValue = null) => {
    if (status === "predat_curier" || status === "predat_fanbox") setIsGenerating(true);
    
    const backendStatus = (status === "predat_fanbox") ? "predat_curier" : status;

    try {
      const res = await apiFetch(`/orders/item/${itemId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ 
          status: backendStatus, 
          weight, 
          packages, 
          insurance: isInsured, 
          forceFanbox: forceFanbox || status === "predat_fanbox",
          declaredValue: isInsured && customDeclaredValue ? Number(customDeclaredValue) : null 
        }) 
      });

      const resData = await res.json();

      if (!res.ok) throw new Error(resData.error || "Eroare la server");

      setOrders(prev => {
        const updatedOrders = prev.map(order => {
          if (order.id === orderId) {
            const updatedItems = order.items.map(item => 
              item.id === itemId ? { ...item, status: backendStatus, awb: resData.item?.awb || item.awb } : item
            );
            
            const allDelivered = updatedItems.every(i => i.status === "livrat");
            const allCanceled = updatedItems.every(i => i.status === "anulat");
            
            if (allDelivered || allCanceled) {
              const finalStatus = allDelivered ? "livrat" : "anulat";
              apiFetch(`/orders/${orderId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: finalStatus })
              });
              return null; 
            }
            return { ...order, items: updatedItems };
          }
          return order;
        });
        return updatedOrders.filter(o => o !== null);
      });

      handleCloseAwbModal();
      showToast("Status actualizat cu succes!");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseAwbModal = () => {
    setAwbModal({ open: false, itemId: null, orderId: null, isFanbox: false, isAssembly: false });
    setPackageWeight(1);
    setPackageCount(1);
    setInsurance(false);
    setDeclaredValue("");
  };

  const initiateConfirmTransfer = (orderId) => {
    setOpModal({ open: true, orderId });
  };

  const executeConfirmTransfer = async () => {
    const orderId = opModal.orderId;
    setOpModal({ open: false, orderId: null }); 
    setConfirmingOpId(orderId); 

    try {
      const res = await apiFetch(`/orders/${orderId}/confirm-transfer`, {
        method: "POST"
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Eroare la confirmarea plății.");
      }

      showToast("Plată confirmată! Mail-urile aferente au fost trimise.", "success");
      fetchOrders(); 
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setConfirmingOpId(null);
    }
  };

  const executeCancelOrder = async () => {
    const orderId = cancelModal.orderId;
    setCancelModal({ open: false, orderId: null });

    try {
      const res = await apiFetch(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "anulat" })
      });

      if (!res.ok) throw new Error("Nu s-a putut anula comanda.");
      
      showToast(`Comanda #${orderId} a fost anulată cu succes!`, "success");
      fetchOrders(); 
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const renderStatusOptions = (item, order, handoverInfo, returnInfo, isOradeaF2F) => {
    const itemName = (item.productName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const isAssembly = itemName.includes("asamblare");
    const serviceKeywords = ['service', 'mentenanta', 'curatare', 'reparatie', 'diagnosticare', 'drift', 'hall', 'stick', 'montaj'];
    const isService = serviceKeywords.some(kw => itemName.includes(kw));
                      
    const isBankTransfer = order.paymentMethod === 'transfer_bancar';

    const initialOption = isBankTransfer 
      ? <option value="in_asteptare_plata">💳 Așteaptă Plata OP</option>
      : (order.paymentMethod === "online"
          ? <option value="in_asteptare">✅ Plătit</option>
          : <option value="in_asteptare">⏳ În Așteptare</option>);

    if (isAssembly) {
      if (isOradeaF2F) {
        return (
          <>
            {initialOption}
            <option value="in_asteptare_ridicare">📍 Așteaptă Ridicare Piese Personal (Oradea)</option>
            <option value="posesie">📥 Piese intrate în Laborator</option>
            <option value="in_pregatire">⚙️ În curs de asamblare</option>
            <option value="gata_de_livrare">🤝 Asamblat & Pregătit pt. Livrare PC Personală</option>
            <option value="livrat">🏁 Predat Final (Închis)</option>
            <option value="anulat">❌ Anulat</option>
          </>
        );
      } else {
        return (
          <>
            {initialOption}
            <option value="in_asteptare_ridicare">🚚 Așteaptă Curier (Clientul trimite piesele)</option>
            <option value="posesie">📥 Piese intrate în Laborator</option>
            <option value="in_pregatire">⚙️ În curs de asamblare</option>
            <option value="gata_de_livrare">📦 Asamblat & Ambalat (Trimite MAIL)</option>
            <option value="predat_curier">🚚 Predat Curier (GENEREAZĂ AWB CURIER TARA)</option>
            <option value="livrat">🏁 Livrat Final (Închis)</option>
            <option value="anulat">❌ Anulat</option>
          </>
        );
      }
    } 
    else if (isService) {
      let pickupText = "⏳ Așteptare Ridicare Personală (Oradea)";
      if (handoverInfo.type.includes("Curier")) pickupText = "🚚 Așteptare Curier (Către noi)";
      if (handoverInfo.type.includes("FANbox")) pickupText = "📦 Așteptare Predare la FANbox (De către client)";

      let generateAwbText = "🤝 Pregătit pentru Predare Personală";
      let awbValue = "gata_de_livrare"; 
      let showAwbOption = false; 
      
      if (!isOradeaF2F) {
        if (returnInfo.type.includes("Curier")) {
            generateAwbText = "🚚 Predat Curier (GENEREAZĂ AWB CURIER)";
            awbValue = "predat_curier";
            showAwbOption = true;
        }
        if (returnInfo.type.includes("FANbox")) {
            generateAwbText = "📦 Predat Curier (GENEREAZĂ AWB FANBOX)";
            awbValue = "predat_fanbox"; 
            showAwbOption = true;
        }
      }

      return (
        <>
          {initialOption}
          <option value="in_asteptare_ridicare">{pickupText}</option>
          <option value="posesie">📥 În laboratorul Karix</option>
          <option value="diagnosticare">🔍 Diagnosticare</option>
          <option value="reparat">✅ Reparat / Gata</option>
          <option value="ireparabil">❌ Ireparabil</option>
          
          {showAwbOption ? (
              <option value={awbValue}>{generateAwbText}</option>
          ) : (
              <option value="gata_de_livrare">{generateAwbText}</option>
          )}
          
          <option value="livrat">🏁 Livrat Final (Închis)</option>
          <option value="anulat">❌ Anulat</option>
        </>
      );
    } 
    else {
      let generateAwbText = "🤝 Pregătit pentru Predare Personală";
      let awbValue = "gata_de_livrare"; 
      let showAwbOption = false; 

      if (!isOradeaF2F) {
        if (returnInfo.type.includes("Curier")) {
            generateAwbText = "🚚 Predat Curier (GENEREAZĂ AWB CURIER)";
            awbValue = "predat_curier";
            showAwbOption = true;
        }
        if (returnInfo.type.includes("FANbox")) {
            generateAwbText = "📦 Predat Curier (GENEREAZĂ AWB FANBOX)";
            awbValue = "predat_fanbox"; 
            showAwbOption = true;
        }
      }

      return (
        <>
          {initialOption}
          <option value="in_procesare">⚙️ În Procesare</option>
          <option value="in_pregatire">🛠️ În Asamblare / Pregătire</option>
          
          {showAwbOption ? (
              <>
                <option value="gata_de_livrare">📦 Ambalat (Așteaptă ridicare logistică)</option>
                <option value={awbValue}>{generateAwbText}</option>
              </>
          ) : (
              <option value="gata_de_livrare">{generateAwbText}</option>
          )}
          
          <option value="livrat">🏁 Livrat Final</option>
          <option value="anulat">❌ Anulat</option>
        </>
      );
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="relative min-h-screen pt-32 pb-24 px-4 sm:px-8 bg-transparent">
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-16 flex flex-col lg:flex-row justify-between items-end gap-8">
          <div>
            <p className="text-indigo-500 font-black text-[10px] uppercase tracking-[0.4em] mb-2 drop-shadow-md">Control Panel</p>
            <h1 className="text-6xl font-black italic text-white tracking-tighter drop-shadow-2xl">Karix <span className="text-indigo-400">Computers</span></h1>
          </div>
          <div className="flex gap-4">
            <Link to="/admin/history" className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 backdrop-blur-md transition-all shadow-xl">Arhivă 📜</Link>
          </div>
        </header>

        <div className="space-y-8">
          {orders.length === 0 ? (
            <div className="text-center py-20 border border-white/5 rounded-[40px] bg-white/5 backdrop-blur-xl shadow-2xl">
              <p className="text-gray-500 font-black uppercase tracking-widest text-sm italic">Nu există comenzi active momentan.</p>
            </div>
          ) : (
            orders.map((order) => {
              const isOrderOradea = order.shippingAddress?.toLowerCase().includes('oradea');
              const isPendingBankTransfer = order.paymentMethod === "transfer_bancar" && order.status === "in_asteptare_plata";

              const rawAddress = order.shippingAddress || "";
              const serviceKeywords = ['service', 'mentenanta', 'curatare', 'reparatie', 'diagnosticare', 'drift', 'hall', 'stick', 'montaj', 'asamblare'];
              
              const isServiceOrder = order.items?.some(item => {
                 const name = (item.productName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                 return serviceKeywords.some(kw => name.includes(kw));
              });
              
              const isOradeaF2F = order.pickupType === "KarixPersonal" || rawAddress.toLowerCase().includes("predare personală");

              let handoverInfo = { type: "", address: "" }; 
              let returnInfo = { type: "", address: "" };   

              if (isServiceOrder) {
                  if (isOradeaF2F) {
                      handoverInfo = { type: "📍 Predare Personală (Oradea)", address: rawAddress };
                      returnInfo = { type: "📍 Predare Personală (Oradea)", address: rawAddress };
                  } else if (order.serviceDeliveryMethod === "fanbox" || rawAddress.includes("| Locker:") || rawAddress.includes("Locker FANbox:")) {
                      if (rawAddress.includes("| Locker:")) {
                          const parts = rawAddress.split("| Locker:");
                          const homeAddress = parts[0].trim();
                          const lockerAddress = parts[1].replace("Locker FANbox:", "").trim();
                          
                          handoverInfo = { type: "📦 FANbox", address: lockerAddress };
                          returnInfo = { type: "🚚 Curier (Acasă)", address: homeAddress };
                      } else {
                          const cleanLockerAddr = rawAddress.replace("Locker FANbox:", "").trim();
                          handoverInfo = { type: "📦 FANbox", address: cleanLockerAddr };
                          returnInfo = { type: "📦 FANbox", address: cleanLockerAddr };
                      }
                  } else {
                      handoverInfo = { type: "🚚 Curier", address: rawAddress };
                      returnInfo = { type: "🚚 Curier", address: rawAddress };
                  }
              } else {
                  if (isOradeaF2F) {
                      returnInfo = { type: "📍 Predare Personală (Oradea)", address: rawAddress };
                  } else if (rawAddress.includes("Locker FANbox:")) {
                      returnInfo = { type: "📦 FANbox", address: rawAddress.replace("Locker FANbox:", "").trim() };
                  } else {
                      returnInfo = { type: "🚚 Curier Standard", address: rawAddress };
                  }
              }

              return (
                <div key={order.id} className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl transition-all hover:bg-white/[0.08]">
                  <div className="flex flex-col lg:flex-row gap-10">
                    <div className="lg:w-1/3 lg:border-r border-white/5 lg:pr-10 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                            #{String(order.id).slice(-8).toUpperCase()}
                          </span>
                          
                          {order.paymentMethod === "transfer_bancar" && (
                              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                               🏦 OP
                              </span>
                          )}
                          {order.paymentMethod === "online" && (
                              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                               💳 Online
                              </span>
                          )}

                          {isOradeaF2F && (
                            <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest bg-pink-500/10 px-2 py-1 rounded-lg border border-pink-500/20">
                              📍 Oradea F2F
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-3xl font-black text-white uppercase italic leading-tight drop-shadow-md">{order.shippingName}</h3>
                        
                        {order.isCompany && (
                          <div className="mt-3 bg-black/20 p-3 rounded-xl border border-indigo-500/20">
                              <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-1">Date Facturare B2B</p>
                              <p className="text-xs font-bold text-white mb-1">{order.companyName}</p>
                              <p className="text-[10px] text-gray-400">CUI: {order.cui} | Reg: {order.regCom}</p>
                          </div>
                        )}

                        <div className="mt-6 space-y-3 text-gray-300 text-xs font-bold italic">
                          <p className="flex items-center gap-2"><span>📧</span> {order.user?.email || 'Fără Email'}</p>
                          <p className="flex items-center gap-2"><span>📞</span> {order.shippingPhone}</p>
                          
                          <div className="mt-4 flex flex-col gap-3 p-4 rounded-2xl bg-black/30 border border-white/5 not-italic font-sans">
                            <h5 className="text-[10px] text-gray-500 font-black uppercase tracking-widest border-b border-white/5 pb-2 mb-1">
                              📦 Detalii Logistică
                            </h5>
                            
                            {isServiceOrder ? (
                              <>
                                <div>
                                  <span className="text-[9px] text-indigo-400 font-black uppercase tracking-wider block mb-1">Preluare (Client ➔ Karix):</span>
                                  <div className="flex items-start gap-2">
                                     <span className="text-white font-bold text-xs">{handoverInfo.type}</span>
                                  </div>
                                  <p className="text-gray-400 text-[11px] mt-1 font-medium break-words leading-relaxed">{handoverInfo.address}</p>
                                </div>
                                <div className="pt-2 border-t border-white/5">
                                  <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider block mb-1">Retur (Karix ➔ Client):</span>
                                  <div className="flex items-start gap-2">
                                     <span className="text-white font-bold text-xs">{returnInfo.type}</span>
                                  </div>
                                  <p className="text-gray-400 text-[11px] mt-1 font-medium break-words leading-relaxed">{returnInfo.address}</p>
                                </div>
                              </>
                            ) : (
                              <div>
                                <span className="text-[9px] text-indigo-400 font-black uppercase tracking-wider block mb-1">Livrare (Karix ➔ Client):</span>
                                <div className="flex items-start gap-2">
                                   <span className="text-white font-bold text-xs">{returnInfo.type}</span>
                                </div>
                                <p className="text-gray-400 text-[11px] mt-1 font-medium break-words leading-relaxed">{returnInfo.address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-3">
                        {isPendingBankTransfer && (
                            <button 
                                onClick={() => initiateConfirmTransfer(order.id)}
                                disabled={confirmingOpId === order.id}
                                className="w-full py-4 rounded-2xl bg-amber-500 text-black font-black uppercase text-[10px] tracking-widest hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                            >
                                {confirmingOpId === order.id ? "Se procesează..." : "✅ Confirmă Încasarea OP"}
                            </button>
                        )}
                        
                        <button 
                            onClick={() => setCancelModal({ open: true, orderId: order.id })}
                            className="w-full py-3 rounded-2xl border border-rose-500/30 text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white shadow-lg shadow-rose-500/10 transition-all"
                        >
                            ❌ Anulează Comanda
                        </button>
                      </div>
                    </div>

                    <div className="lg:w-2/3 space-y-6">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 text-center lg:text-left">Status Produse</h4>
                      {order.items?.map((item) => {
                         const itemName = (item.productName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                         const isAssembly = itemName.includes("asamblare");
                         const isService = ['service', 'mentenanta', 'curatare', 'reparatie', 'diagnosticare', 'drift', 'hall', 'stick', 'montaj'].some(kw => itemName.includes(kw));

                         // 👉 NOU: Logica pentru a asigura că specs e obiect
                         let safeSpecs = null;
                         if (item.specs) {
                           if (typeof item.specs === 'object') {
                             safeSpecs = item.specs;
                           } else if (typeof item.specs === 'string') {
                             try {
                               safeSpecs = JSON.parse(item.specs);
                             } catch (e) {
                               console.error("Eroare la parsarea specs:", e);
                             }
                           }
                         }

                         // 👉 LOG DEBUG PENTRU CONSOLĂ
                         console.log("Specs pt", item.productName, ":", safeSpecs);

                         return (
                            <div key={item.id} className={`p-6 rounded-[25px] border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all group backdrop-blur-md ${
                              item.status === 'livrat' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'
                            }`}>
                              <div className="flex-1 w-full">
                                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isService || isAssembly ? 'text-pink-400' : 'text-indigo-400'}`}>
                                  {isAssembly ? '⚙️ Asamblare' : (isService ? '🛠️ Serviciu' : '💻 Hardware')}
                                </p>
                                <h5 className="text-lg font-bold text-white uppercase italic tracking-tight">{item.productName}</h5>
                                
                                {/* 👉 AICI SE AFIȘEAZĂ SPECIFICAȚIILE PC-ULUI PENTRU ADMIN */}
                                {safeSpecs && Object.keys(safeSpecs).length > 0 && (
                                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 max-w-2xl">
                                    {[
                                      { label: "CPU", val: safeSpecs.cpu },
                                      { label: "GPU", val: safeSpecs.gpu },
                                      { label: "MB", val: safeSpecs.motherboard },
                                      { label: "RAM", val: safeSpecs.ram || safeSpecs.ramGb },
                                      { label: "SSD", val: safeSpecs.storage || safeSpecs.storageGb },
                                      { label: "CASE", val: safeSpecs.case },
                                      { label: "COOL", val: safeSpecs.cooler },
                                      { label: "PSU", val: safeSpecs.psu },
                                    ].map((spec, idx) => spec.val ? (
                                      <div key={idx} className="flex flex-col bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/5">
                                        <span className="text-[8px] text-indigo-400 font-black uppercase tracking-widest">{spec.label}</span>
                                        {/* Am înlocuit truncate cu text care se continuă pe următorul rând */}
                                        <span className="text-[10px] text-gray-300 font-bold whitespace-normal break-words mt-0.5" title={spec.val}>{spec.val}</span>
                                      </div>
                                    ) : null)}
                                  </div>
                                )}

                                {item.awb && (
                                  <p className="text-[10px] text-cyan-400 font-mono mt-3 bg-cyan-500/10 px-2 py-1 rounded inline-block border border-cyan-500/20">AWB: {item.awb}</p>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0 mt-4 sm:mt-0">
                                <select 
                                  value={item.status}
                                  onChange={(e) => handleUpdateItemStatus(order.id, item.id, e.target.value, isAssembly)}
                                  className={`w-full bg-[#0b1020]/90 border rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-indigo-500 transition-all cursor-pointer backdrop-blur-md ${
                                    item.status === 'livrat' ? 'border-emerald-500/50 text-emerald-400' : 'border-white/10'
                                  }`}
                                >
                                  {renderStatusOptions(item, order, handoverInfo, returnInfo, isOradeaF2F)}
                                </select>
                              </div>
                            </div>
                         );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL PENTRU AWB GENERATOR */}
      {awbModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={handleCloseAwbModal}></div>
          
          <div className="relative w-full max-w-md p-10 rounded-[40px] bg-[#12192c]/95 backdrop-blur-3xl border border-white/10 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-white uppercase italic mb-2">Detalii Expediere</h2>
            <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-8 italic">Se va genera AWB FAN Courier</p>
            
            <div className="flex gap-4 mb-6">
                <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Greutate (kg)</label>
                    <input 
                        autoFocus 
                        type="number" 
                        min="1"
                        value={packageWeight} 
                        onChange={(e) => setPackageWeight(e.target.value)} 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black italic outline-none focus:border-indigo-500 shadow-inner" 
                        placeholder="Ex: 15" 
                    />
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Nr. Colete</label>
                    <input 
                        type="number" 
                        min="1"
                        value={packageCount} 
                        onChange={(e) => setPackageCount(e.target.value)} 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black italic outline-none focus:border-indigo-500 shadow-inner" 
                        placeholder="Ex: 1" 
                    />
                </div>
            </div>

            <div className="mb-8">
              <label className="flex items-center cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    checked={insurance} 
                    onChange={(e) => setInsurance(e.target.checked)} 
                    className="sr-only" 
                  />
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${insurance ? 'bg-indigo-500 border-indigo-500' : 'bg-transparent border-gray-600 group-hover:border-indigo-400'}`}>
                    {insurance && (
                      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L4.5 8.5L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex flex-col">
                  <span className="text-white font-bold text-sm italic">Adaugă Asigurare Colet 🛡️</span>
                  <span className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-1">Protecție în caz de deteriorare</span>
                </div>
              </label>

              {insurance && awbModal.isAssembly && (
                  <div className="mt-6 animate-in fade-in zoom-in duration-300 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">
                      Valoare Totală PC (RON)
                    </label>
                    <input 
                      type="number" 
                      min="1"
                      value={declaredValue}
                      onChange={(e) => setDeclaredValue(e.target.value)}
                      className="w-full bg-black/30 border border-indigo-500/30 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-indigo-500"
                      placeholder="Ex: 8500 (Pt. asigurare curier)"
                    />
                    <p className="text-gray-400 text-[9px] mt-2 italic">Valoarea reală a componentelor pentru despăgubiri.</p>
                  </div>
              )}
            </div>

            <div className="flex gap-4">
                <button onClick={handleCloseAwbModal} className="flex-1 py-4 text-gray-500 font-black uppercase text-[10px] hover:text-white transition-colors">Anulare</button>
                <button 
                  disabled={isGenerating || (insurance && awbModal.isAssembly && !declaredValue)}
                  onClick={() => executeItemUpdate(awbModal.orderId, awbModal.itemId, awbModal.isFanbox ? "predat_fanbox" : "predat_curier", packageWeight, packageCount, insurance, false, declaredValue)} 
                  className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] shadow-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? "Se trimite..." : "Generare AWB"}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMARE OP */}
      {opModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setOpModal({ open: false, orderId: null })}></div>
          <div className="relative w-full max-w-md p-10 rounded-[40px] bg-[#12192c]/95 backdrop-blur-3xl border border-amber-500/20 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h2 className="text-xl font-black text-amber-400 uppercase italic mb-2">Confirmare Încasare</h2>
            <p className="text-gray-400 text-xs mb-8 font-medium leading-relaxed">
              Ești sigur că au intrat banii în cont pentru comanda <strong className="text-white">#{opModal.orderId}</strong>? <br/><br/>
              Acest pas va <strong className="text-emerald-400">emite factura fiscală în SmartBill</strong> și o va trimite clientului pe e-mail, deblocând logistica asamblării/service-ului.
            </p>
            <div className="flex gap-4">
                <button onClick={() => setOpModal({ open: false, orderId: null })} className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 font-black uppercase text-[10px] hover:text-white hover:bg-white/10 transition-colors">Înapoi</button>
                <button onClick={executeConfirmTransfer} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[10px] shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-colors">Da, confirm plata!</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANULARE COMANDĂ ADMIN */}
      {cancelModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setCancelModal({ open: false, orderId: null })}></div>
          <div className="relative w-full max-w-md p-10 rounded-[40px] bg-[#12192c]/95 backdrop-blur-3xl border border-rose-500/20 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-black text-rose-400 uppercase italic mb-2">Anulare Comandă</h2>
            <p className="text-gray-400 text-xs mb-8 font-medium leading-relaxed">
              Ești sigur că vrei să anulezi global comanda <strong className="text-white">#{cancelModal.orderId}</strong>? <br/><br/>
              Aceasta va dispărea din comenzile active și va fi mutată în Arhivă cu statusul "Anulat".
            </p>
            <div className="flex gap-4">
                <button onClick={() => setCancelModal({ open: false, orderId: null })} className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 font-black uppercase text-[10px] hover:text-white hover:bg-white/10 transition-colors">Înapoi</button>
                <button onClick={executeCancelOrder} className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] shadow-xl shadow-rose-600/20 hover:bg-rose-500 transition-colors">Da, anulează</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMsg.open && (
        <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-right duration-300">
          <div className={`rounded-3xl border p-6 shadow-3xl flex items-center gap-5 backdrop-blur-2xl ${
            toastMsg.type === "error" ? "bg-rose-900/90 border-rose-500/30" : "bg-[#1a2236]/90 border-emerald-500/30"
          }`}>
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg ${
              toastMsg.type === "error" ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
            }`}>
              {toastMsg.type === "error" ? "!" : "✓"}
            </div>
            <div className="flex-1 text-sm font-bold text-white drop-shadow-md">{toastMsg.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}