import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [awbModal, setAwbModal] = useState({ open: false, itemId: null, orderId: null });
  const [tempAwb, setTempAwb] = useState("");

  const [confirmingOpId, setConfirmingOpId] = useState(null);
  
  // NOI STĂRI PENTRU ALERTE CUSTOM
  const [toastMsg, setToastMsg] = useState({ open: false, type: "success", text: "" });
  const [opModal, setOpModal] = useState({ open: false, orderId: null });

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

  const handleUpdateItemStatus = async (orderId, itemId, newStatus) => {
    if (newStatus === "predat_curier") {
      setAwbModal({ open: true, itemId, orderId });
      return;
    }
    await executeItemUpdate(orderId, itemId, newStatus, null);
  };

  const executeItemUpdate = async (orderId, itemId, status, awb) => {
    try {
      const res = await apiFetch(`/orders/item/${itemId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, awb })
      });

      if (!res.ok) throw new Error("Eroare la server");

      setOrders(prev => {
        const updatedOrders = prev.map(order => {
          if (order.id === orderId) {
            const updatedItems = order.items.map(item => 
              item.id === itemId ? { ...item, status, awb: awb || item.awb } : item
            );
            
            const allDelivered = updatedItems.every(i => i.status === "livrat");
            
            if (allDelivered) {
              apiFetch(`/orders/${orderId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: "livrat" })
              });
              return null;
            }
            return { ...order, items: updatedItems };
          }
          return order;
        });
        return updatedOrders.filter(o => o !== null);
      });

      setAwbModal({ open: false, itemId: null, orderId: null });
      setTempAwb("");
      showToast("Status actualizat cu succes!");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Funcția care doar deschide modal-ul de confirmare
  const initiateConfirmTransfer = (orderId) => {
    setOpModal({ open: true, orderId });
  };

  // Funcția care execută efectiv confirmarea după ce se apasă "DA" în modal
  const executeConfirmTransfer = async () => {
    const orderId = opModal.orderId;
    setOpModal({ open: false, orderId: null }); // Închidem modalul
    setConfirmingOpId(orderId); // Punem butonul în starea "Se procesează..."

    try {
      const res = await apiFetch(`/orders/${orderId}/confirm-transfer`, {
        method: "POST"
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Eroare la confirmarea plății.");
      }

      showToast("Plată confirmată! Factura a fost trimisă clientului.", "success");
      fetchOrders(); 
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setConfirmingOpId(null);
    }
  };

  const renderStatusOptions = (item, order) => {
    const itemName = (item.productName || "").toLowerCase();
    const isService = itemName.includes('service') || 
                      itemName.includes('mentenanta') ||
                      itemName.includes('curatare') ||
                      itemName.includes('reparatie');
                      
    const isOradea = order.shippingAddress?.toLowerCase().includes('oradea');

    if (isService) {
      if (isOradea) {
        return (
          <>
            <option value="in_asteptare_plata">💳 Așteaptă Plata OP</option>
            <option value="in_asteptare_ridicare">⏳ Așteptare Preluare Personală</option>
            <option value="posesie">📥 În laboratorul Karix</option>
            <option value="diagnosticare">🔍 Diagnosticare</option>
            <option value="reparat">✅ Reparat / Gata</option>
            <option value="ireparabil">❌ Ireparabil</option>
            <option value="gata_de_livrare">🤝 Pregătit pentru Predare</option>
            <option value="livrat">🏁 Predat (Finalizat)</option>
          </>
        );
      } else {
        return (
          <>
            <option value="in_asteptare_plata">💳 Așteaptă Plata OP</option>
            <option value="in_asteptare_ridicare">🚚 Așteptare Curier (Către noi)</option>
            <option value="posesie">📥 În laboratorul Karix</option>
            <option value="diagnosticare">🔍 Diagnosticare</option>
            <option value="reparat">✅ Reparat / Gata</option>
            <option value="ireparabil">❌ Ireparabil</option>
            <option value="predat_curier">📦 Predat Curier (Retur Către Client)</option>
            <option value="livrat">🏁 Livrat Final</option>
          </>
        );
      }
    } else {
      if (isOradea) {
        return (
          <>
            <option value="in_asteptare_plata">💳 Așteaptă Plata OP</option>
            <option value="in_procesare">⚙️ În Procesare</option>
            <option value="in_pregatire">🛠️ În Asamblare</option>
            <option value="gata_de_livrare">🤝 Gata de Livrare Personală</option>
            <option value="livrat">🏁 Livrat Final</option>
          </>
        );
      } else {
        return (
          <>
            <option value="in_asteptare_plata">💳 Așteaptă Plata OP</option>
            <option value="in_procesare">⚙️ În Procesare</option>
            <option value="in_pregatire">🛠️ În Asamblare</option>
            <option value="gata_de_livrare">📦 Ambalat (Așteaptă Curier)</option>
            <option value="predat_curier">🚚 Predat Curier (AWB)</option>
            <option value="livrat">🏁 Livrat Final</option>
          </>
        );
      }
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

                          {isOrderOradea && (
                            <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest bg-pink-500/10 px-2 py-1 rounded-lg border border-pink-500/20">
                              📍 Oradea
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

                        <div className="mt-6 space-y-4 text-gray-300 text-xs font-bold italic">
                          <p className="flex items-center gap-2"><span>📧</span> {order.user?.email || 'Fără Email'}</p>
                          <p className="flex items-center gap-2"><span>📞</span> {order.shippingPhone}</p>
                          <p className="leading-relaxed flex items-start gap-2"><span>📍</span> {order.shippingAddress}</p>
                        </div>
                      </div>

                      {isPendingBankTransfer && (
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <button 
                                onClick={() => initiateConfirmTransfer(order.id)}
                                disabled={confirmingOpId === order.id}
                                className="w-full py-4 rounded-2xl bg-amber-500 text-black font-black uppercase text-[10px] tracking-widest hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                            >
                                {confirmingOpId === order.id ? "Se procesează..." : "✅ Confirmă Încasarea OP"}
                            </button>
                            <p className="text-[9px] text-gray-500 text-center mt-2 italic">Va genera factura și va trece comanda în procesare.</p>
                        </div>
                      )}
                    </div>

                    <div className="lg:w-2/3 space-y-6">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 text-center lg:text-left">Status Produse</h4>
                      {order.items?.map((item) => {
                         const itemName = (item.productName || "").toLowerCase();
                         const isService = itemName.includes('service') || 
                                           itemName.includes('mentenanta') ||
                                           itemName.includes('curatare') ||
                                           itemName.includes('reparatie');
                         return (
                            <div key={item.id} className={`p-6 rounded-[25px] border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all group backdrop-blur-md ${
                              item.status === 'livrat' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'
                            }`}>
                              <div className="flex-1">
                                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isService ? 'text-pink-400' : 'text-indigo-400'}`}>
                                  {isService ? '🛠️ Serviciu' : '💻 Hardware'}
                                </p>
                                <h5 className="text-lg font-bold text-white uppercase italic tracking-tight">{item.productName}</h5>
                                {item.awb && (
                                  <p className="text-[10px] text-cyan-400 font-mono mt-2 bg-cyan-500/10 px-2 py-1 rounded inline-block border border-cyan-500/20">AWB: {item.awb}</p>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 w-full sm:w-auto">
                                <select 
                                  value={item.status}
                                  onChange={(e) => handleUpdateItemStatus(order.id, item.id, e.target.value)}
                                  className={`bg-[#0b1020]/90 border rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-indigo-500 transition-all cursor-pointer backdrop-blur-md ${
                                    item.status === 'livrat' ? 'border-emerald-500/50 text-emerald-400' : 'border-white/10'
                                  }`}
                                >
                                  {renderStatusOptions(item, order)}
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

      {/* MODAL PENTRU AWB */}
      {awbModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setAwbModal({ open: false, itemId: null, orderId: null })}></div>
          <div className="relative w-full max-w-md p-10 rounded-[40px] bg-[#12192c]/95 backdrop-blur-3xl border border-white/10 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-white uppercase italic mb-2">Introdu AWB</h2>
            <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-8 italic">Expediere către client prin Curier</p>
            <input 
              autoFocus 
              type="text" 
              value={tempAwb} 
              onChange={(e) => setTempAwb(e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black italic mb-6 outline-none focus:border-indigo-500 shadow-inner" 
              placeholder="Cod Tracking (AWB)..." 
            />
            <div className="flex gap-4">
                <button onClick={() => setAwbModal({ open: false, itemId: null, orderId: null })} className="flex-1 py-4 text-gray-500 font-black uppercase text-[10px] hover:text-white transition-colors">Anulare</button>
                <button onClick={() => executeItemUpdate(awbModal.orderId, awbModal.itemId, "predat_curier", tempAwb)} className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] shadow-xl hover:bg-indigo-500 transition-colors">Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMARE OP (CUSTOM) */}
      {opModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setOpModal({ open: false, orderId: null })}></div>
          <div className="relative w-full max-w-md p-10 rounded-[40px] bg-[#12192c]/95 backdrop-blur-3xl border border-amber-500/20 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h2 className="text-xl font-black text-amber-400 uppercase italic mb-2">Confirmare Încasare</h2>
            <p className="text-gray-400 text-xs mb-8 font-medium leading-relaxed">
              Ești sigur că au intrat banii în cont pentru comanda <strong className="text-white">#{opModal.orderId}</strong>? <br/><br/>
              Acest pas va <strong className="text-emerald-400">emite factura fiscală în SmartBill</strong> și o va trimite clientului pe e-mail.
            </p>
            <div className="flex gap-4">
                <button onClick={() => setOpModal({ open: false, orderId: null })} className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 font-black uppercase text-[10px] hover:text-white hover:bg-white/10 transition-colors">Înapoi</button>
                <button onClick={executeConfirmTransfer} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[10px] shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-colors">Da, confirm plata!</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION (CUSTOM) */}
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