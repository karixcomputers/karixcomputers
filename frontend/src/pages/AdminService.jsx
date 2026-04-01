import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

const STATUS_COLORS = {
  in_asteptare: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  preluat: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_service: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  finalizat: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  expediat: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  livrat: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  garantie_respinsa: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export default function AdminService() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  
  // State-uri pentru Modale
  const [showAwbModal, setShowAwbModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form State pentru Respingere
  const [rejectReason, setRejectReason] = useState("");
  const [rejectImages, setRejectImages] = useState([]);
  const [awbValue, setAwbValue] = useState("");

  const { data: allOrders, isLoading } = useQuery({
    queryKey: ["adminServiceOrders"],
    queryFn: async () => {
      const res = await apiFetch("/service-orders/admin/all");
      if (!res.ok) throw new Error("Eroare la încărcarea datelor.");
      return res.json();
    },
  });

  const activeOrders = allOrders?.filter((o) => o.status !== "livrat");

  // Mutație Update Status (AWB, etc)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, awb }) => {
      const res = await apiFetch(`/service-orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, awb }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["adminServiceOrders"]);
      closeModals();
    },
  });

  // Mutație Respingere Garanție (cu Email și Poze)
  const rejectWarrantyMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await apiFetch(`/service-orders/${selectedOrder.id}/reject-warranty`, {
        method: "POST",
        body: formData, // Trimitem FormData pentru poze
      });
      if (!res.ok) throw new Error("Eroare la trimiterea refuzului.");
      return res.json();
    },
    onSuccess: () => {
      alert("Garanția a fost respinsă și emailul a fost trimis clientului.");
      queryClient.invalidateQueries(["adminServiceOrders"]);
      closeModals();
    },
  });

  const closeModals = () => {
    setShowAwbModal(false);
    setShowRejectModal(false);
    setSelectedOrder(null);
    setAwbValue("");
    setRejectReason("");
    setRejectImages([]);
  };

  const handleStatusChange = (order, newStatus) => {
    setSelectedOrder(order);
    if (newStatus === "expediat") {
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

  if (isLoading) return <div className="min-h-screen pt-32 px-6 text-white italic animate-pulse">Se încarcă...</div>;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        {/* Header & Tabel (rămân identice ca structură) */}
        <header className="mb-10 flex justify-between items-end">
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
            Service <span className="text-indigo-500">Activ</span>
          </h1>
        </header>

        <div className="overflow-x-auto rounded-[35px] border border-white/5 bg-[#0b1020]/50 backdrop-blur-3xl shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                <th className="p-6">Client / Produs</th>
                <th className="p-6">Status Actual</th>
                <th className="p-6 text-right">Schimbă Status</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {activeOrders?.map((order) => (
                <tr key={order.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-6">
                    <div className="font-bold text-sm">{order.customerName}</div>
                    <div className="text-[10px] text-indigo-400 font-black uppercase italic">{order.productName}</div>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${STATUS_COLORS[order.status]}`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <select
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500 text-white"
                      value={order.status}
                      onChange={(e) => handleStatusChange(order, e.target.value)}
                    >
                      <option value="in_service" className="bg-[#0b1020]">În laborator</option>
                      <option value="finalizat" className="bg-[#0b1020]">Finalizat</option>
                      <option value="expediat" className="bg-[#0b1020]">📦 Expediat</option>
                      <option value="garantie_respinsa" className="bg-[#0b1020]">❌ Garanție Respinsă</option>
                      <option value="livrat" className="bg-[#0b1020]">✅ Livrat</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                    <div key={idx} className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[8px] text-gray-500 p-2 text-center overflow-hidden">
                      {img.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={closeModals} className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-black uppercase text-[10px] tracking-widest transition-all">Anulează</button>
                <button 
                  disabled={!rejectReason || rejectWarrantyMutation.isPending}
                  onClick={handleRejectSubmit}
                  className="flex-2 px-8 py-4 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 shadow-lg shadow-rose-600/40 transition-all"
                >
                  {rejectWarrantyMutation.isPending ? "Se trimite..." : "Confirmă & Trimite Email"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AWB (Păstrat) */}
      {showAwbModal && (
        // ... codul existent pentru AWB ...
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            {/* Modalul AWB de mai devreme */}
        </div>
      )}
    </div>
  );
}