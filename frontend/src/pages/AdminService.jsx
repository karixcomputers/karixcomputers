import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

const STATUS_COLORS = {
  in_drum_laborator: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  in_laborator: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  in_lucru: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  finalizat: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  garantie_respinsa: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  awb_finalizat: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  awb_respins: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  livrat: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const STATUS_LABELS = {
  in_drum_laborator: "🚚 În drum spre laborator",
  in_laborator: "📥 În laborator",
  in_lucru: "⚙️ În lucru",
  finalizat: "✅ Finalizat",
  garantie_respinsa: "❌ Garanție Respinsă",
  awb_finalizat: "📦 AWB Retur (Finalizat)",
  awb_respins: "📦 AWB Retur (Respins)",
  livrat: "🏁 Livrat",
};

export default function AdminService() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  
  // State-uri pentru Tab-uri
  const [activeTab, setActiveTab] = useState("active"); // "active" | "history"

  // State-uri pentru Modale
  const [showAwbModal, setShowAwbModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // State pentru Toast-uri frumoase
  const [toastMsg, setToastMsg] = useState({ open: false, text: "", type: "success" });

  const showToast = (text, type = "success") => {
    setToastMsg({ open: true, text, type });
    setTimeout(() => setToastMsg({ open: false, text: "", type: "success" }), 4000);
  };

  // State pentru AWB
  const [packageWeight, setPackageWeight] = useState(1);
  const [packageCount, setPackageCount] = useState(1);
  const [insurance, setInsurance] = useState(false);
  const [declaredValue, setDeclaredValue] = useState("");
  const [targetAwbStatus, setTargetAwbStatus] = useState("");

  // Form State pentru Respingere
  const [rejectReason, setRejectReason] = useState("");
  const [rejectImages, setRejectImages] = useState([]);

  const { data: allOrders, isLoading } = useQuery({
    queryKey: ["adminServiceOrders"],
    queryFn: async () => {
      const res = await apiFetch("/service-orders/admin/all");
      if (!res.ok) throw new Error("Eroare la încărcarea datelor.");
      return res.json();
    },
  });

  // Împărțim comenzile în Active și Istoric
  const activeOrders = allOrders?.filter((o) => o.status !== "livrat") || [];
  const historyOrders = allOrders?.filter((o) => o.status === "livrat") || [];

  const currentList = activeTab === "active" ? activeOrders : historyOrders;

  // Mutație Update Status (Simplu sau cu AWB)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, weight, packages, isInsured, customDeclaredValue }) => {
      const res = await apiFetch(`/service-orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ 
            status,
            weight,
            packages,
            insurance: isInsured,
            declaredValue: isInsured && customDeclaredValue ? Number(customDeclaredValue) : null 
        }),
      });
      if (!res.ok) throw new Error("Eroare la actualizarea statusului.");
      return res.json();
    },
    onSuccess: () => {
      showToast("Statusul comenzii a fost actualizat cu succes!", "success");
      queryClient.invalidateQueries(["adminServiceOrders"]);
      closeModals();
    },
    onError: (error) => {
      showToast(error.message, "error");
    }
  });

  // Mutație Respingere Garanție (cu Email și Poze)
  const rejectWarrantyMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await apiFetch(`/service-orders/${selectedOrder.id}/reject-warranty`, {
        method: "POST",
        body: formData, 
      });
      if (!res.ok) throw new Error("Eroare la trimiterea refuzului.");
      return res.json();
    },
    onSuccess: () => {
      showToast("Garanția a fost respinsă. Clientul a primit email cu detaliile.", "success");
      queryClient.invalidateQueries(["adminServiceOrders"]);
      closeModals();
    },
    onError: (error) => {
      showToast(error.message, "error");
    }
  });

  const closeModals = () => {
    setShowAwbModal(false);
    setShowRejectModal(false);
    setSelectedOrder(null);
    setRejectReason("");
    setRejectImages([]);
    setPackageWeight(1);
    setPackageCount(1);
    setInsurance(false);
    setDeclaredValue("");
    setTargetAwbStatus("");
  };

  const handleStatusChange = (order, newStatus) => {
    setSelectedOrder(order);
    
    if (newStatus === "awb_finalizat" || newStatus === "awb_respins") {
      setTargetAwbStatus(newStatus);
      setShowAwbModal(true);
    } else if (newStatus === "garantie_respinsa") {
      setShowRejectModal(true);
    } else {
      updateStatusMutation.mutate({ id: order.id, status: newStatus });
    }
  };

  const handleRejectSubmit = () => {
    const formData = new FormData();
    formData.append("reason", rejectReason);
    rejectImages.forEach((file) => formData.append("images", file));
    
    rejectWarrantyMutation.mutate(formData);
  };

  const handleAwbSubmit = () => {
      updateStatusMutation.mutate({
          id: selectedOrder.id,
          status: targetAwbStatus,
          weight: packageWeight,
          packages: packageCount,
          isInsured: insurance,
          customDeclaredValue: declaredValue
      });
  };

  // Helper pentru a formata Order ID-ul frumos
  const formatOrderId = (id) => {
      if (!id) return "N/A";
      return `#${String(id).slice(-8).toUpperCase()}`;
  };

  if (isLoading) return <div className="min-h-screen pt-32 px-6 text-white italic animate-pulse flex justify-center items-center"><div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col lg:flex-row justify-between items-end gap-8">
          <div className="text-left w-full lg:w-auto">
            <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter drop-shadow-2xl">
              Control <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Service</span>
            </h1>
            
            {/* Butoane Tab-uri */}
            <div className="flex gap-4 mt-8 bg-white/5 p-1.5 rounded-[20px] border border-white/10 w-fit backdrop-blur-xl">
              <button 
                onClick={() => setActiveTab("active")}
                className={`px-6 py-3 rounded-[15px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "active" ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Service Activ ({activeOrders.length})
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`px-6 py-3 rounded-[15px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "history" ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Istoric Finalizate ({historyOrders.length})
              </button>
            </div>
          </div>
        </header>

        {currentList.length === 0 ? (
          <div className="p-20 rounded-[45px] bg-white/5 border border-white/10 backdrop-blur-xl text-center shadow-2xl border-dashed">
            <p className="text-gray-500 font-black uppercase tracking-widest text-sm italic">
              {activeTab === 'active' ? 'Nu există cereri de service active.' : 'Nu există istoric de service.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[35px] border border-white/5 bg-[#0b1020]/50 backdrop-blur-3xl shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <th className="p-6">Detalii Client & Comandă</th>
                  <th className="p-6">Status Actual</th>
                  <th className="p-6 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {currentList.map((order) => (
                  <tr key={order.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-6">
                      <div className="flex items-baseline gap-3 mb-1">
                        <div className="font-bold text-sm text-white">{order.customerName}</div>
                        {order.phoneNumber && (
                          <div className="text-[10px] text-gray-400 font-mono tracking-widest bg-black/20 px-2 py-0.5 rounded border border-white/5">
                            📞 {order.phoneNumber}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                          <span className="text-[10px] text-indigo-400 font-black uppercase italic">{order.productName}</span>
                          <span className="text-[9px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 tracking-widest">
                             {formatOrderId(order.orderId)}
                          </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border whitespace-nowrap ${STATUS_COLORS[order.status] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <select
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500 text-white cursor-pointer"
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                      >
                        <option value="in_drum_laborator" className="bg-[#0b1020]">🚚 În drum spre laborator</option>
                        <option value="in_laborator" className="bg-[#0b1020]">📥 În laborator</option>
                        <option value="in_lucru" className="bg-[#0b1020]">⚙️ În lucru</option>
                        <option value="finalizat" className="bg-[#0b1020]">✅ Finalizat</option>
                        <option value="garantie_respinsa" className="bg-[#0b1020]">❌ Garanție Respinsă</option>
                        <option value="awb_finalizat" className="bg-[#0b1020]">📦 Generare AWB Retur (Finalizat)</option>
                        <option value="awb_respins" className="bg-[#0b1020]">📦 Generare AWB Retur (Garanție Respinsă)</option>
                        <option value="livrat" className="bg-[#0b1020]">🏁 Livrat (Mută în Istoric)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL RESPINGERE GARANȚIE */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-white/10 p-8 rounded-[40px] max-w-2xl w-full shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl font-black text-white uppercase italic mb-2">Respingere Garanție</h2>
            <p className="text-gray-400 text-xs mb-6 font-medium">Produs: <span className="text-rose-500 font-bold">{selectedOrder?.productName}</span></p>
            
            <div className="space-y-6">
              {/* Text Motiv */}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Motivul Refuzului (se va trimite pe email)</label>
                <textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Produsul prezintă urme de oxidare pe placa de bază datorate contactului cu lichide..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white outline-none focus:border-rose-500/50 transition-all text-sm min-h-[120px]"
                />
              </div>

              {/* Upload Poze */}
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block tracking-widest">Dovezi Foto</label>
                <input 
                  type="file" 
                  multiple 
                  hidden 
                  ref={fileInputRef} 
                  onChange={(e) => setRejectImages([...e.target.files])}
                />
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center text-2xl hover:border-rose-500/40 transition-all"
                  >
                    📸
                  </button>
                  {rejectImages.map((img, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[8px] text-gray-500 p-2 text-center overflow-hidden break-all">
                      {img.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={closeModals} className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-black uppercase text-[10px] tracking-widest transition-all hover:bg-white/10">Anulează</button>
                <button 
                  disabled={!rejectReason || rejectWarrantyMutation.isPending}
                  onClick={handleRejectSubmit}
                  className="flex-2 px-8 py-4 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 shadow-lg shadow-rose-600/40 transition-all disabled:opacity-50"
                >
                  {rejectWarrantyMutation.isPending ? "Se trimite..." : "Confirmă & Trimite Email"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENERARE AWB (FINALIZAT SAU RESPINS) */}
      {showAwbModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-in fade-in duration-300">
          <div className="relative w-full max-w-md p-10 rounded-[40px] bg-[#12192c]/95 border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-black text-white uppercase italic mb-2">Detalii Expediere</h2>
            <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-8 italic">
              Generare AWB pentru {targetAwbStatus === "awb_finalizat" ? "Retur Produs Finalizat" : "Retur Garanție Respinsă"}
            </p>
            
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
                        placeholder="Ex: 5" 
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
              <label className="flex items-center cursor-pointer group w-fit">
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
                  <span className="text-white font-bold text-sm italic">Asigură Coletul (Devalorizare Automată) 🛡️</span>
                  <span className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-1">Backend-ul va calcula valoarea automat</span>
                </div>
              </label>

              {insurance && (
                  <div className="mt-6 animate-in fade-in zoom-in duration-300 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">
                      Valoare Custom Asigurare (Opțional)
                    </label>
                    <input 
                      type="number" 
                      min="1"
                      value={declaredValue}
                      onChange={(e) => setDeclaredValue(e.target.value)}
                      className="w-full bg-black/30 border border-indigo-500/30 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-indigo-500"
                      placeholder="Lasă gol pentru calcul automat"
                    />
                    <p className="text-gray-400 text-[9px] mt-2 italic">Dacă introduci o valoare, va suprascrie calculul automat de devalorizare.</p>
                  </div>
              )}
            </div>

            <div className="flex gap-4">
                <button onClick={closeModals} className="flex-1 py-4 text-gray-500 font-black uppercase text-[10px] hover:text-white transition-colors">Anulare</button>
                <button 
                  disabled={updateStatusMutation.isPending}
                  onClick={handleAwbSubmit} 
                  className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] shadow-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateStatusMutation.isPending ? "Se trimite..." : "Confirmă & Generează AWB"}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMsg.open && (
        <div className="fixed bottom-10 right-10 z-[150] animate-in slide-in-from-right duration-300">
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