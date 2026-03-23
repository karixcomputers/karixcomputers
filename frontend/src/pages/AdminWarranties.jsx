import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { formatRON } from "../utils/money";

export default function AdminWarranties() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active"); // "active" | "history"

  useEffect(() => {
    const fetchAllOrders = async () => {
      try {
        // MODIFICAT: din "/api/orders/admin/history" în "/orders/admin/history"
        const res = await apiFetch("/orders/admin/history");
        if (res.ok) {
          const data = await res.json();
          setOrders(Array.isArray(data) ? data : data.orders || []);
        }
      } catch (err) {
        console.error("Eroare la preluarea garanțiilor:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllOrders();
  }, []);

  // 1. GENERĂM ȘI CATEGORIZĂM GARANȚIILE
  const { activeWarranties, historyWarranties } = useMemo(() => {
    const activeArr = [];
    const historyArr = [];
    const SERVICE_KEYWORDS = ['mentenanta', 'service', 'diagnosticare', 'curatare', 'montaj', 'reparatie'];

    orders.forEach(order => {
      if (order.status === 'livrat') {
        const finalizedReturnedProducts = (order.returnRequests || [])
          .filter(req => req.status === 'completat')
          .flatMap(req => req.returnedItems || []);

        order.items.forEach(item => {
          const nameStr = (item.productName || "").toLowerCase();
          const isService = item.category === 'service' || SERVICE_KEYWORDS.some(kw => nameStr.includes(kw));

          if (!isService) {
            const purchaseDate = new Date(order.createdAt);
            const expiryDate = new Date(order.createdAt);
            expiryDate.setMonth(expiryDate.getMonth() + 24);

            const isExpired = new Date() > expiryDate;
            const isReturned = finalizedReturnedProducts.includes(item.productName);
            const warrantyId = `WR-${String(item.id).slice(-4).toUpperCase()}`;

            const warrantyObj = {
              id: warrantyId,
              clientName: order.shippingName,
              clientEmail: order.user?.email || "N/A",
              productName: item.productName,
              purchaseDate: purchaseDate,
              expiryDate: expiryDate,
              orderRef: String(order.id).slice(-6).toUpperCase(),
              isReturned: isReturned,
              isExpired: isExpired,
              status: isReturned ? "Anulată (Retur)" : (isExpired ? "Expirată" : "Activă")
            };

            if (isReturned || isExpired) {
              historyArr.push(warrantyObj);
            } else {
              activeArr.push(warrantyObj);
            }
          }
        });
      }
    });

    return { activeWarranties: activeArr, historyWarranties: historyArr };
  }, [orders]);

  const currentList = activeTab === "active" ? activeWarranties : historyWarranties;
  
  const filteredData = useMemo(() => {
    return currentList.filter(w => 
      w.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, currentList]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-8 bg-transparent relative">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-12 flex flex-col lg:flex-row justify-between items-end gap-8">
          <div className="text-left w-full lg:w-auto">
            <h1 className="text-5xl font-black italic text-white uppercase tracking-tighter drop-shadow-2xl">
              Control <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Garanții</span>
            </h1>
            
            <div className="flex gap-4 mt-8 bg-white/5 p-1.5 rounded-[20px] border border-white/10 w-fit backdrop-blur-xl">
              <button 
                onClick={() => setActiveTab("active")}
                className={`px-6 py-3 rounded-[15px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "active" ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Active ({activeWarranties.length})
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`px-6 py-3 rounded-[15px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "history" ? 'bg-rose-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Istoric / Anulate ({historyWarranties.length})
              </button>
            </div>
          </div>

          <div className="relative w-full lg:w-96 group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-indigo-400 group-focus-within:text-pink-400 transition-colors">
              <span className="text-xl">🔍</span>
            </div>
            <input 
              type="text"
              placeholder="Caută client sau produs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[25px] py-5 pl-14 pr-6 text-white outline-none focus:border-indigo-500/50 backdrop-blur-xl transition-all shadow-2xl placeholder-gray-600 font-bold italic text-sm"
            />
          </div>
        </header>

        {filteredData.length === 0 ? (
          <div className="p-20 rounded-[45px] bg-white/5 border border-white/10 backdrop-blur-xl text-center shadow-2xl border-dashed">
            <p className="text-gray-500 font-black uppercase tracking-widest text-sm italic">
              {searchTerm ? "Niciun rezultat găsit." : `Nu există garanții ${activeTab === 'active' ? 'active' : 'în istoric'}.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredData.map((w, idx) => (
              <div 
                key={idx} 
                className={`group relative p-[1px] rounded-[35px] bg-gradient-to-br transition-all duration-500 shadow-2xl ${
                  w.isReturned || w.isExpired 
                    ? 'from-white/5 to-transparent grayscale opacity-70' 
                    : 'from-white/10 to-transparent hover:from-indigo-500/30'
                }`}
              >
                <div className="p-8 md:p-10 rounded-[34px] bg-[#0b1020]/70 backdrop-blur-3xl flex flex-col lg:flex-row justify-between items-center gap-8 text-white">
                  
                  <div className="flex items-center gap-8 w-full lg:w-1/2">
                    <div className={`h-20 w-20 rounded-3xl flex items-center justify-center text-3xl border shadow-inner transition-transform group-hover:scale-110 ${
                      activeTab === 'active' 
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                        : 'bg-white/5 border-white/10 text-gray-500'
                    }`}>
                      {w.isReturned ? '📦' : (w.isExpired ? '⌛' : '🛡️')}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-2xl font-black italic uppercase tracking-tight truncate ${w.isReturned ? 'line-through text-gray-500' : ''}`}>
                          {w.productName}
                        </h3>
                        <span className="shrink-0 px-2 py-0.5 rounded bg-white/10 text-[8px] font-black text-indigo-300 border border-indigo-500/20 tracking-widest uppercase">
                          {w.isReturned ? "Fără Garanție" : "24 Luni"}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-400 italic mb-2">{w.clientName} • <span className="text-xs opacity-50">{w.clientEmail}</span></p>
                      <div className="flex gap-4">
                         <span className={`text-[10px] font-black px-2 py-1 rounded shadow-lg ${activeTab === 'active' ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                           {w.id}
                         </span>
                         <span className="text-[10px] font-black bg-white/5 text-gray-500 px-2 py-1 rounded border border-white/5">REF: #{w.orderRef}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-12 w-full lg:w-1/2 border-t lg:border-t-0 border-white/5 pt-6 lg:pt-0">
                    <div className="text-left md:text-right">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Data Achiziției</p>
                      <p className="text-sm font-bold text-gray-300">{w.purchaseDate.toLocaleDateString('ro-RO')}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Data Expirării</p>
                      <p className={`text-lg font-black italic ${activeTab === 'active' ? 'text-white' : 'text-rose-500'}`}>
                        {w.expiryDate.toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                    
                    <div className={`px-6 py-3 rounded-2xl border font-black uppercase text-[10px] tracking-widest shadow-lg ${
                      w.status === 'Activă' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    }`}>
                      {w.status}
                    </div>
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