import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyOrders } from "../api/orders";
import { apiFetch } from "../api/client"; 
import { formatRON } from "../utils/money";

// Helper Status Badge Inteligent
function StatusBadge({ status, isService, isOradea }) {
  let label = status;
  let color = "text-gray-400 border-white/5 bg-white/5";

  if (isService) {
    if (isOradea) {
      const map = {
        in_asteptare: { label: "În așteptare", color: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
        in_asteptare_ridicare: { label: "Așteaptă Preluarea", color: "text-pink-400 border-pink-500/20 bg-pink-500/5" },
        posesie: { label: "În laborator", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5" },
        diagnosticare: { label: "Diagnosticare", color: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
        reparat: { label: "Reparat / Gata", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" },
        ireparabil: { label: "Ireparabil", color: "text-rose-500 border-rose-500/20 bg-rose-500/5" },
        gata_de_livrare: { label: "Pregătit pt Predare", color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5" },
        livrat: { label: "Predat", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" },
        anulat: { label: "Anulată", color: "text-gray-500 border-white/10 bg-white/5" },
      };
      if (map[status]) { label = map[status].label; color = map[status].color; }
    } else {
      const map = {
        in_asteptare: { label: "În așteptare", color: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
        in_asteptare_ridicare: { label: "Așteaptă Curierul", color: "text-pink-400 border-pink-500/20 bg-pink-500/5" },
        posesie: { label: "În laborator", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5" },
        diagnosticare: { label: "Diagnosticare", color: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
        reparat: { label: "Reparat / Gata", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" },
        ireparabil: { label: "Ireparabil", color: "text-rose-500 border-rose-500/20 bg-rose-500/5" },
        predat_curier: { label: "Expediat (Retur)", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5" },
        livrat: { label: "Livrat", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" },
        anulat: { label: "Anulată", color: "text-gray-500 border-white/10 bg-white/5" },
      };
      if (map[status]) { label = map[status].label; color = map[status].color; }
    }
  } else {
    // Hardware PC
    if (isOradea) {
       const map = {
        in_asteptare: { label: "În așteptare", color: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
        in_procesare: { label: "În Procesare", color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
        in_pregatire: { label: "În Asamblare", color: "text-amber-500 border-amber-500/20 bg-amber-500/5" },
        gata_de_livrare: { label: "Gata de Predare", color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5" },
        livrat: { label: "Predat", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" },
        anulat: { label: "Anulată", color: "text-gray-500 border-white/10 bg-white/5" },
      };
      if (map[status]) { label = map[status].label; color = map[status].color; }
    } else {
       const map = {
        in_asteptare: { label: "În așteptare", color: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
        in_procesare: { label: "În Procesare", color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
        in_pregatire: { label: "În Asamblare", color: "text-amber-500 border-amber-500/20 bg-amber-500/5" },
        gata_de_livrare: { label: "Ambalat", color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5" },
        predat_curier: { label: "Expediat", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5" },
        livrat: { label: "Livrat", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" },
        anulat: { label: "Anulată", color: "text-gray-500 border-white/10 bg-white/5" },
      };
      if (map[status]) { label = map[status].label; color = map[status].color; }
    }
  }

  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md ${color}`}>
      {label}
    </span>
  );
}

// CORECTAT: Helper Payment Status Badge
function PaymentBadge({ paymentMethod, status }) {
  let label = "💵 Ramburs";
  let color = "text-gray-400 border-gray-500/20 bg-gray-500/5";

  // Verificăm conținutul exact. Ar putea fi "online", "Online", sau "card"
  const method = (paymentMethod || "").toLowerCase();

  if (method === "online" || method === "card") {
    if (status === "in_asteptare") {
        label = "⏳ Plată În Așteptare";
        color = "text-amber-400 border-amber-500/20 bg-amber-500/5";
    } else if (status === "anulat") {
        label = "❌ Plată Anulată";
        color = "text-rose-500 border-rose-500/20 bg-rose-500/5";
    } else {
        label = "💳 Plătit Online";
        color = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    }
  }

  return (
    <span className={`px-2 py-1 ml-3 rounded text-[8px] font-bold uppercase tracking-wider border backdrop-blur-sm inline-flex items-center ${color}`}>
      {label}
    </span>
  );
}

// Helper Return Request Status
function ReturnRequestStatus({ status }) {
  const config = {
    pending: { label: "În procesare ⏳", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    received_ok: { label: "Recepționat OK 📦", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    received_issues: { label: "Probleme recepție ⚠️", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
    completat: { label: "Bani returnați ✅", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    respins: { label: "Retur respins ❌", color: "text-rose-600 bg-rose-600/10 border-rose-600/20" },
  }[status] || { label: status, color: "text-gray-400 bg-white/5 border-white/10" };

  return (
    <div className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest italic ${config.color}`}>
      {config.label}
    </div>
  );
}

export default function Orders() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");
  const [cancelModal, setCancelModal] = useState({ open: false, orderId: null });
  
  const [downloadingId, setDownloadingId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(""), 4000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["myOrders"],
    queryFn: fetchMyOrders,
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId) => {
      const res = await apiFetch(`/orders/${orderId}/cancel`, { method: "PATCH" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Nu s-a putut anula comanda.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myOrders"]);
      setCancelModal({ open: false, orderId: null });
      navigate("/order-canceled"); 
    },
  });

  const canCancel = (order) => {
    const cancelableStatuses = ["in_asteptare", "in_procesare", "in_asteptare_ridicare"];
    if (order.status === "anulat" || order.status === "livrat") return false;
    return order.items.every(it => cancelableStatuses.includes(it.status));
  };

  const getReturnInfo = (order) => {
    if (order.status !== 'livrat') return null;
    const deliveryDate = new Date(order.updatedAt || order.createdAt);
    const expiryDate = new Date(deliveryDate);
    expiryDate.setDate(expiryDate.getDate() + 14);
    const isExpired = new Date() > expiryDate;
    
    return {
      isExpired,
      expiryDate: expiryDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })
    };
  };

  // CORECTAT: Funcția de descărcare factură - Am scos /api/ în plus
  const handleDownloadInvoice = async (orderId) => {
    setDownloadingId(orderId);
    try {
        // apiFetch adaugă deja domeniul și uneori `/api`, așa că dăm calea relativă justă.
        // În funcție de cum e scris apiFetch-ul tău, dacă el adaugă deja `/api`, lăsăm așa:
        const response = await apiFetch(`/orders/${orderId}/invoice`, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error('Factura nu este încă disponibilă sau a apărut o eroare la server.');
        }

        const blob = await response.blob();
        
        if (blob.size < 100) {
             throw new Error('Factura generată este invalidă.');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Factura_Karix_${orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error("Download invoice error:", error);
        showToast(error.message || "Eroare la descărcarea facturii.");
    } finally {
        setDownloadingId(null);
    }
  };

  const allReturns = data?.flatMap(order => 
    (order.returnRequests || []).map(req => ({
      ...req,
      parentOrder: order
    }))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) || [];

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent text-left">
      <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-12">
          <h1 className="text-5xl font-black text-white tracking-tighter mb-4 italic drop-shadow-2xl uppercase">
            {activeTab === "orders" ? "Comenzile " : "Retururile "} 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">mele</span>
          </h1>
          
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-fit backdrop-blur-md">
            <button 
              onClick={() => setActiveTab("orders")}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-white text-[#0b1020] shadow-xl' : 'text-gray-500 hover:text-white'}`}
            >
              🛒 Istoric Comenzi
            </button>
            <button 
              onClick={() => setActiveTab("returns")}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'returns' ? 'bg-white text-[#0b1020] shadow-xl' : 'text-gray-500 hover:text-white'}`}
            >
              📦 Status Retururi ({allReturns.length})
            </button>
          </div>
        </header>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {data?.length === 0 && !isLoading && (
               <div className="p-20 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl text-center shadow-2xl">
                  <p className="text-gray-500 font-bold italic uppercase tracking-widest text-sm">Nu ai nicio comandă înregistrată.</p>
               </div>
            )}

            {data?.map(o => {
              const returnInfo = getReturnInfo(o);
              const returnRequests = o.returnRequests || [];
              const serviceKeywords = ['service', 'mentenanta', 'curatare', 'reparatie', 'montaj', 'diagnosticare', 'upgrade'];
              
              const returnableItemsCount = o.items.filter(it => {
                  const name = (it.productName || "").toLowerCase();
                  return !serviceKeywords.some(kw => name.includes(kw));
              }).length;

              const returnedItemsNames = returnRequests.flatMap(req => req.returnedItems || []);
              const uniqueReturnedCount = [...new Set(returnedItemsNames)].length;
              const isFullyReturned = returnableItemsCount > 0 && uniqueReturnedCount >= returnableItemsCount;
              
              const isOradea = o.shippingAddress?.toLowerCase().includes('oradea');

              return (
                <div key={o.id} className={`p-[1px] rounded-[45px] bg-gradient-to-b from-white/10 to-transparent shadow-2xl transition-all ${o.status === 'anulat' ? 'opacity-50 grayscale' : ''}`}>
                  <div className="bg-[#0f172a]/60 backdrop-blur-3xl p-8 md:p-10 rounded-[44px]">
                    
                    <div className="flex flex-col md:flex-row justify-between gap-6 mb-10 border-b border-white/10 pb-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Referință Tranzacție</div>
                          {isOradea && (
                            <span className="text-[8px] font-black text-pink-400 uppercase tracking-widest bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                              📍 Oradea
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-black text-white italic drop-shadow-md flex items-center flex-wrap gap-y-2">
                            #{String(o.id).slice(-8).toUpperCase()}
                            <PaymentBadge paymentMethod={o.paymentMethod} status={o.status} />
                        </div>
                        <div className="text-xs text-gray-400 font-medium italic">Plasată pe {new Date(o.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      </div>
                      
                      <div className="text-left md:text-right flex flex-col items-start md:items-end">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Valoare Totală</div>
                        <div className="text-3xl font-black text-white tracking-tighter drop-shadow-lg">{formatRON(o.totalCents)}</div>
                        
                        <div className="flex gap-2 mt-4">
                            {/* Buton Descărcare Factură */}
                            {!(o.paymentMethod === 'online' && o.status === 'in_asteptare') && (
                                <button 
                                    onClick={() => handleDownloadInvoice(o.id)} 
                                    disabled={downloadingId === o.id}
                                    className="px-4 py-2 rounded-xl border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-lg shadow-indigo-500/10 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {downloadingId === o.id ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin"></div>
                                            Se descarcă...
                                        </>
                                    ) : (
                                        <>📄 Factură</>
                                    )}
                                </button>
                            )}

                            {canCancel(o) && (
                                <button onClick={() => setCancelModal({ open: true, orderId: o.id })} className="px-4 py-2 rounded-xl border border-rose-500/30 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/10">Anulează</button>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {o.items.map(it => {
                        const itemName = (it.productName || "").toLowerCase();
                        const isService = serviceKeywords.some(kw => itemName.includes(kw));

                        return (
                          <div key={it.id} className="group relative p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-indigo-500/20 transition-all backdrop-blur-md">
                            <div className="flex justify-between items-center gap-4">
                               <div className="flex items-center gap-3">
                                 <span className="text-xs font-black text-indigo-400">{it.qty}×</span>
                                 <div>
                                    <h5 className="text-sm font-bold text-white uppercase tracking-tight italic">{it.productName}</h5>
                                    {it.awb && (
                                      <p className="text-[10px] text-cyan-400 font-mono mt-1 bg-cyan-500/10 px-2 py-0.5 rounded inline-block border border-cyan-500/20">AWB: {it.awb}</p>
                                    )}
                                 </div>
                               </div>
                               <StatusBadge status={it.status} isService={isService} isOradea={isOradea} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {returnInfo && (
                      <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                          Sistem Retur Parțial Karix (14 zile)
                        </div>

                        {!returnInfo.isExpired && !isFullyReturned && (
                          <button 
                            onClick={() => navigate("/return-request", { state: { order: o } })}
                            className="px-6 py-2.5 rounded-xl bg-white text-[#0b1020] font-black uppercase text-[9px] tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-xl italic"
                          >
                            Inițiază Retur Nou 📦
                          </button>
                        )}

                        {isFullyReturned && (
                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-[9px] font-black uppercase tracking-widest italic">
                                Toate produsele au fost returnate ✅
                            </div>
                        )}
                        
                        {returnInfo.isExpired && !isFullyReturned && (
                           <div className="text-[9px] text-rose-500/40 font-black uppercase italic">
                              Perioada de retur a expirat ({returnInfo.expiryDate})
                           </div>
                        )}
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-4 text-gray-400">
                      <div className="flex items-start gap-4">
                        <div className="text-xl grayscale">📍</div>
                        <div className="text-xs leading-relaxed font-medium">
                          <span className="text-white font-bold block mb-1 uppercase tracking-widest text-[9px]">Destinație Livrare:</span>
                          <span className="text-gray-300">{o.shippingName} • {o.shippingPhone}</span> <br/>
                          <span className="text-gray-400 italic">{o.shippingAddress}</span>
                        </div>
                      </div>
                      
                      {o.isCompany && (
                        <div className="ml-10 bg-black/20 p-3 rounded-xl border border-white/5 inline-block w-fit">
                          <span className="text-white font-bold block mb-1 uppercase tracking-widest text-[9px]">Facturat pe firmă:</span>
                          <span className="text-gray-300 text-xs font-bold">{o.companyName}</span><br/>
                          <span className="text-gray-500 text-[10px]">CUI: {o.cui} | Reg: {o.regCom}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "returns" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {allReturns.length === 0 && !isLoading && (
               <div className="p-20 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl text-center">
                  <p className="text-gray-500 font-bold italic uppercase tracking-widest text-sm">Nu ai nicio cerere de retur activă.</p>
               </div>
            )}

            {allReturns.map((req) => (
              <div key={req.id} className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full" />
                
                <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-xl">📦</span>
                      <div>
                        <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Solicitare Retur #{req.id.slice(-4).toUpperCase()}</div>
                        <div className="text-lg font-bold text-white italic uppercase tracking-tight">Comandă #{req.orderNumber}</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                      <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Produse vizate</div>
                      <div className="text-xs text-gray-300 font-medium leading-relaxed italic">
                        {req.returnedItems?.join(", ") || "Toată comanda"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-[10px]">
                       <div className="text-gray-500">Inițiat la: <span className="text-white font-bold">{new Date(req.createdAt).toLocaleDateString('ro-RO')}</span></div>
                       <div className="text-gray-500">Titular IBAN: <span className="text-white font-bold">{req.titular}</span></div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end justify-between gap-6">
                    <ReturnRequestStatus status={req.status} />
                    <div className="text-right">
                       <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Destinație Ramburs</div>
                       <div className="text-xs font-mono text-indigo-400 font-bold tracking-wider bg-indigo-500/5 px-3 py-1.5 rounded-lg border border-indigo-500/10">
                         {req.iban.replace(/(.{4})/g, '$1 ')}
                       </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3 text-gray-500 text-[10px] font-medium italic">
                  <span>💡</span>
                  {req.status === 'pending' && "Așteptăm pachetul tău. Imediat ce ajunge la noi, îl verificăm și procesăm rambursarea."}
                  {req.status === 'received_ok' && "Produsul a fost recepționat cu succes. Plata este în curs de procesare către contul tău IBAN."}
                  {req.status === 'completat' && "Tranzacție finalizată. Fondurile ar trebui să apară în contul tău în 1-3 zile lucrătoare."}
                  {req.status === 'received_issues' && "Am depistat probleme la recepție. Verifică e-mail-ul pentru detalii despre stadiul returului."}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-right duration-300">
          <div className="rounded-3xl border border-pink-500/30 bg-[#1a2236]/90 p-6 shadow-3xl flex items-center gap-5 backdrop-blur-2xl">
            <div className="h-12 w-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-xl font-bold text-pink-400 shadow-lg">!</div>
            <div className="flex-1 text-sm font-bold text-white drop-shadow-md">{toastMsg}</div>
          </div>
        </div>
      )}

      {cancelModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <div className="bg-[#0f172a] border border-white/10 p-10 rounded-[40px] max-w-md w-full shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="text-4xl mb-6">⚠️</div>
            <h2 className="text-2xl font-black text-white uppercase italic mb-4">Confirmă Anularea</h2>
            <p className="text-gray-400 text-sm mb-8 font-medium leading-relaxed">
              Ești sigur că dorești să anulezi? <br/>
              <span className="text-rose-400 font-black">Banii vor fi returnați în maxim 10 zile.</span>
            </p>
            <div className="flex gap-4">
              <button onClick={() => setCancelModal({ open: false, orderId: null })} className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">Înapoi</button>
              <button onClick={() => cancelMutation.mutate(cancelModal.orderId)} className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 shadow-lg shadow-rose-600/40 transition-all">
                {cancelMutation.isPending ? "Se anulează..." : "Confirm Anularea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}