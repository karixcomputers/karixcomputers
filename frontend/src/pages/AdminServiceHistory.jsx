import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client"; 

export default function AdminServiceHistory() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["adminServiceOrders"], // Refolosim cheia pentru cache
    queryFn: async () => {
      // MODIFICAT: din "/service-orders/admin/all" în "/service-orders/admin/all"
      const res = await apiFetch("/service-orders/admin/all");
      return res.json();
    },
  });

  const historyOrders = orders?.filter(o => o.status === "livrat");

  if (isLoading) return <div className="min-h-screen pt-32 px-6 text-white italic">Se încarcă istoricul...</div>;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
              Istoric <span className="text-emerald-500">Service</span>
            </h1>
            <p className="text-gray-500 text-sm italic">Toate dispozitivele reparate și livrate către clienți.</p>
          </div>
          <button 
            onClick={() => window.location.href = '/admin/service'}
            className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all"
          >
            ← ÎNAPOI LA SERVICE ACTIV
          </button>
        </header>

        <div className="overflow-x-auto rounded-[35px] border border-white/5 bg-[#0b1020]/20 backdrop-blur-3xl shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                <th className="p-6">Client / Produs</th>
                <th className="p-6">Metodă / AWB</th>
                <th className="p-6">Data Finalizării</th>
                <th className="p-6 text-right">Status Final</th>
              </tr>
            </thead>
            <tbody className="text-white/60 text-xs">
              {historyOrders?.map((order) => (
                <tr key={order.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-6">
                    <div className="font-bold text-white">{order.customerName}</div>
                    <div className="text-[10px] text-gray-500 font-black uppercase">{order.productName}</div>
                  </td>
                  <td className="p-6">
                    <div>{order.method === "curier" ? "🚚 Curier" : "📍 Oradea"}</div>
                    {order.awb && <div className="text-[9px] text-indigo-400 font-bold">AWB: {order.awb}</div>}
                  </td>
                  <td className="p-6 italic text-gray-600">
                    {new Date(order.updatedAt).toLocaleDateString('ro-RO')}
                  </td>
                  <td className="p-6 text-right">
                    <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase border border-emerald-500/20 text-emerald-500 bg-emerald-500/5">
                      LIVRAT ✓
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}