import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

export default function AdminTickets() {
  const queryClient = useQueryClient();
  
  const [filter, setFilter] = useState("deschis"); 

  // 1. Fetch toate tichetele din sistem
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      // MODIFICAT: din "/api/tickets/admin/all" în "/tickets/admin/all"
      const res = await apiFetch("/tickets/admin/all");
      if (!res.ok) throw new Error("Nu s-au putut încărca tichetele.");
      return res.json();
    },
    refetchInterval: 10000, 
  });

  // 2. Mutație pentru schimbare status rapidă
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      // MODIFICAT: din "/api/tickets/${id}/status" în "/tickets/${id}/status"
      const res = await apiFetch(`/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-tickets"]);
    },
  });

  // Filtrare locală
  const filteredTickets = useMemo(() => {
    if (filter === "toate") return tickets;
    return tickets.filter(t => t.status === filter);
  }, [tickets, filter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "deschis": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "in_lucru": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "inchis": return "bg-white/5 text-gray-500 border-white/10";
      default: return "bg-white/5 text-white border-white/10";
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-8 bg-transparent text-left">
      <div className="max-w-7xl mx-auto relative z-10">
        
        <header className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-1 bg-indigo-500 rounded-full"></span>
              <p className="text-gray-500 font-black text-[10px] uppercase tracking-[0.4em]">Helpdesk Center</p>
            </div>
            <h1 className="text-7xl font-black italic tracking-tighter leading-none text-white">
              Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">Tichete</span>
            </h1>
            <p className="text-gray-400 mt-4 font-medium italic">Gestionează solicitările de suport de la clienții Karix.</p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
            {["toate", "deschis", "in_lucru", "inchis"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f ? "bg-white text-[#0b1020] shadow-xl" : "text-gray-500 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {isLoading ? (
          <div className="py-20 text-center text-white italic animate-pulse">Se încarcă tichetele...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-20 border border-white/5 rounded-[40px] bg-white/5 backdrop-blur-md text-center">
             <p className="text-gray-500 font-black uppercase tracking-widest text-sm italic">Nu există tichete în categoria "{filter}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTickets.map((t) => (
              <div key={t.id} className="group relative p-[1px] rounded-[32px] bg-gradient-to-br from-white/10 to-transparent hover:from-indigo-500/30 transition-all duration-500">
                <div className="bg-[#0b1020]/70 backdrop-blur-xl p-6 sm:p-8 rounded-[31px] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  
                  <div className="flex items-start gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner">
                      🎫
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getStatusColor(t.status)}`}>
                          {t.status}
                        </span>
                        <span className="text-indigo-400 font-black text-[10px] uppercase tracking-tighter">#{t.id}</span>
                      </div>
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tight mb-2">{t.subject}</h3>
                      <div className="flex flex-wrap gap-y-2 gap-x-6 text-gray-400 text-[11px] font-medium italic">
                        <span>👤 Client: <strong className="text-white not-italic">{t.user?.name || "N/A"}</strong></span>
                        <span>📧 Email: <strong className="text-white not-italic">{t.user?.email}</strong></span>
                        <span>🏷️ Categorie: <strong className="text-indigo-400 not-italic">{t.category}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: t.id, status: "deschis" })}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          t.status === "deschis" 
                            ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                            : "text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        Deschis
                      </button>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: t.id, status: "in_lucru" })}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          t.status === "in_lucru" 
                            ? "bg-amber-500 text-[#0b1020] shadow-[0_0_15px_rgba(245,158,11,0.4)]" 
                            : "text-gray-500 hover:text-amber-400 hover:bg-amber-500/10"
                        }`}
                      >
                        În Lucru
                      </button>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: t.id, status: "inchis" })}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          t.status === "inchis" 
                            ? "bg-white/20 text-white" 
                            : "text-gray-500 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        Închis
                      </button>
                    </div>

                    <Link 
                      to={`/tickets/${t.id}`}
                      className="px-8 py-4 rounded-xl bg-white text-[#0b1020] font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 hover:text-white transition-all text-center shadow-xl flex-1 lg:flex-none"
                    >
                      Raspunde →
                    </Link>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}