import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client"; 

export default function AdminHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchHistory = async () => {
    try {
      setLoading(true);
      // MODIFICAT: din "/api/orders/admin/history" în "/orders/admin/history"
      const res = await apiFetch("/orders/admin/history");
      if (!res.ok) {
        throw new Error("Nu s-a putut accesa baza de date a arhivei.");
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (err) {
      console.error("Eroare la încărcarea arhivei:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filtrare comenzi după Search Term (ID sau Nume Client)
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const idStr = String(order.id).toLowerCase();
      const nameStr = (order.shippingName || "").toLowerCase();
      const term = searchTerm.toLowerCase();
      return idStr.includes(term) || nameStr.includes(term);
    });
  }, [searchTerm, orders]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="relative min-h-screen pt-32 pb-24 px-4 sm:px-8 bg-transparent">
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-white">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-1 bg-indigo-500 rounded-full"></span>
              <p className="text-gray-500 font-black text-[10px] uppercase tracking-[0.4em]">Storage & Records</p>
            </div>
            <h1 className="text-6xl md:text-7xl font-black italic tracking-tighter leading-none drop-shadow-2xl">
              Karix <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">Arhivă</span>
            </h1>
            <p className="text-gray-400 mt-4 font-medium italic drop-shadow-md">Comenzi Livrate / Anulate.</p>
          </div>

          {/* BARA DE CĂUTARE */}
          <div className="relative w-full lg:w-96 group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-indigo-400 group-focus-within:text-pink-400 transition-colors">
              <span className="text-xl">🔍</span>
            </div>
            <input 
              type="text"
              placeholder="Caută după ID sau Nume..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[25px] py-5 pl-14 pr-6 text-white outline-none focus:border-indigo-500/50 backdrop-blur-xl transition-all shadow-2xl placeholder-gray-600 font-bold italic text-sm"
            />
          </div>
          
          <Link to="/admin" className="px-8 py-5 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all flex items-center gap-3 text-white shadow-xl">
              <span className="text-xl">←</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
          </Link>
        </header>

        {error ? (
          <div className="text-center py-20 border border-pink-500/20 rounded-[40px] bg-pink-500/10 backdrop-blur-md">
            <p className="text-pink-500 font-black uppercase tracking-widest text-sm">{error}</p>
            <button onClick={fetchHistory} className="mt-4 text-xs text-gray-400 underline uppercase">Reîncearcă</button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 border border-white/5 rounded-[40px] bg-white/5 backdrop-blur-md">
            <p className="text-gray-500 font-black uppercase tracking-widest text-sm italic uppercase">
              {searchTerm ? "Nicio comandă nu corespunde căutării." : "Arhiva este goală momentan."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.id} className="group relative p-[1px] rounded-[32px] bg-gradient-to-br from-white/10 to-transparent hover:from-indigo-500/30 transition-all duration-500 shadow-2xl">
                <div className="bg-[#0b1020]/70 backdrop-blur-xl p-8 sm:p-10 rounded-[31px] h-full w-full text-white">
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    <div className="lg:col-span-7">
                      <div className="flex flex-wrap items-center gap-4 mb-6">
                        <span className="text-[10px] font-black px-3 py-1 bg-white/10 text-gray-400 rounded-lg border border-white/10 uppercase">
                          COMANDA # {String(order.id).toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          order.status === 'livrat' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-pink-500/30 text-pink-400 bg-pink-500/10'
                        }`}>
                          {order.status === 'livrat' ? '✓ Livrată' : '✕ Anulată'}
                        </span>
                      </div>

                      <h3 className="text-4xl font-black text-white italic mb-6 uppercase tracking-tight drop-shadow-md">
                        {order.shippingName}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-12 text-gray-300 italic text-xs font-medium">
                        <p className="flex items-center gap-2">📧 {order.user?.email || 'N/A'}</p>
                        <p className="flex items-center gap-2">📞 {order.shippingPhone}</p>
                        <p className="md:col-span-2 flex items-start gap-2">📍 {order.shippingAddress}</p>
                        {order.awb && <p className="text-cyan-400 font-mono font-bold tracking-tighter">📦 AWB: {order.awb}</p>}
                      </div>
                    </div>

                    <div className="lg:col-span-5 flex flex-col justify-center items-start lg:items-end border-t lg:border-t-0 lg:border-l border-white/5 pt-8 lg:pt-0 lg:pl-10">
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Valoare Tranzacție</p>
                      <p className="text-5xl font-black italic tracking-tighter text-white drop-shadow-xl">
                        {(order.totalCents / 100).toFixed(2)} <span className="text-xl text-indigo-400/50">RON</span>
                      </p>
                      <p className="text-[10px] text-gray-500 font-black mt-4 uppercase tracking-[0.2em] italic opacity-60">
                        {new Date(order.createdAt).toLocaleString('ro-RO')}
                      </p>
                    </div>

                  </div>
                            
                  <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-2">
                    {order.items?.map((item, idx) => (
                      <span key={idx} className="text-[10px] bg-white/5 px-3 py-1.5 rounded-full text-gray-300 border border-white/5 backdrop-blur-sm">
                        <strong className="text-indigo-400">{item.qty}x</strong> {item.productName}
                      </span>
                    ))}
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