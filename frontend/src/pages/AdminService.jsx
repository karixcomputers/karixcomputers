import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

const STATUS_COLORS = {
  in_asteptare: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  preluat: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_service: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  finalizat: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  expediat: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  livrat: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export default function AdminService() {
  const queryClient = useQueryClient();
  const [showAwbModal, setShowAwbModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [awbValue, setAwbValue] = useState("");

  const { data: allOrders, isLoading } = useQuery({
    queryKey: ["adminServiceOrders"],
    queryFn: async () => {
      const res = await apiFetch("/api/service-orders/admin/all");
      if (!res.ok) throw new Error("Eroare la încărcarea datelor.");
      return res.json();
    },
  });

  const activeOrders = allOrders?.filter((o) => o.status !== "livrat");

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, awb }) => {
      const res = await apiFetch(`/api/service-orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, awb }),
      });
      if (!res.ok) throw new Error("Nu am putut actualiza statusul.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["adminServiceOrders"]);
      closeModal();
    },
  });

  const closeModal = () => {
    setShowAwbModal(false);
    setSelectedOrder(null);
    setAwbValue("");
  };

  const handleStatusChange = (order, newStatus) => {
    if (newStatus === "expediat") {
      setSelectedOrder(order);
      setShowAwbModal(true);
    } else {
      updateStatusMutation.mutate({ id: order.id, status: newStatus });
    }
  };

  if (isLoading) return <div className="min-h-screen pt-32 px-6 text-white italic animate-pulse">Se încarcă...</div>;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
              Service <span className="text-indigo-500">Activ</span>
            </h1>
            <p className="text-gray-500 text-sm italic">Cererile aflate în lucru sau în tranzit.</p>
          </div>
          <button
            onClick={() => (window.location.href = "/admin/service/history")}
            className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all"
          >
            📜 VEZI ISTORIC SERVICE
          </button>
        </header>

        {/* TABEL ADMIN */}
        <div className="overflow-x-auto rounded-[35px] border border-white/5 bg-[#0b1020]/50 backdrop-blur-3xl shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                <th className="p-6">Client / Produs</th>
                <th className="p-6">Metodă / Info</th>
                <th className="p-6">Status Actual</th>
                <th className="p-6 text-right">Schimbă Status</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {activeOrders?.map((order) => (
                <tr key={order.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-6">
                    <div className="font-bold text-sm text-white">{order.customerName}</div>
                    <div className="text-[10px] text-indigo-400 font-black uppercase italic">{order.productName}</div>
                    <div className="text-[9px] text-gray-600 mt-1 italic">ID: #{order.orderId || order.id.slice(-5)}</div>
                  </td>
                  <td className="p-6">
                    <div className="text-xs font-medium">{order.method === "curier" ? "🚚 Curier" : "📍 Oradea"}</div>
                    {order.awb && <div className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1">AWB: {order.awb}</div>}
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${STATUS_COLORS[order.status]}`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <select
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500 transition-all cursor-pointer text-white"
                      value={order.status}
                      onChange={(e) => handleStatusChange(order, e.target.value)}
                    >
                      <option value="in_asteptare" className="bg-[#0b1020]">În așteptare</option>
                      <option value="preluat" className="bg-[#0b1020]">Preluat Curier</option>
                      <option value="in_service" className="bg-[#0b1020]">În laborator</option>
                      <option value="finalizat" className="bg-[#0b1020]">Finalizat (Gata de livrare)</option>
                      <option value="expediat" className="bg-[#0b1020]">📦 Predat la Curier</option>
                      <option value="livrat" className="bg-[#0b1020]">✅ Livrat (Mută la Istoric)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PENTRU INTRODUCERE AWB */}
      {showAwbModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-white/10 p-8 md:p-10 rounded-[40px] max-w-md w-full shadow-2xl text-center relative overflow-hidden">
            {/* Decoratiune fundal */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />
            
            <div className="text-4xl mb-6">🚚</div>
            <h2 className="text-2xl font-black text-white uppercase italic mb-2">Confirmă Expedierea</h2>
            <p className="text-gray-400 text-xs mb-8 font-medium leading-relaxed">
              Introdu numărul de urmărire (AWB) pentru produsele destinate lui <br/>
              <span className="text-purple-400 font-bold">{selectedOrder?.customerName}</span>.
            </p>

            <div className="space-y-4">
              <div className="relative group">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Introdu AWB-ul aici..."
                  value={awbValue}
                  onChange={(e) => setAwbValue(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white outline-none focus:border-purple-500/50 transition-all font-mono text-sm tracking-widest placeholder:text-gray-600"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={closeModal}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                >
                  Anulează
                </button>
                <button 
                  disabled={!awbValue.trim() || updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: selectedOrder.id, status: "expediat", awb: awbValue })}
                  className="flex-1 py-4 rounded-2xl bg-purple-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-purple-500 shadow-lg shadow-purple-600/40 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  {updateStatusMutation.isPending ? "Se salvează..." : "Confirmă & Trimite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}