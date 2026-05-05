import React, { useState, useEffect } from "react";
import { formatRON } from "../utils/money";
import { apiFetch } from "../api/client";
import SEO from "../components/SEO";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ 
    totalOrders: 0, 
    totalRevenueCents: 0,
    statusCounts: { inProcess: 0, delivered: 0, canceled: 0 },
    chartData: [],
    topProducts: []
  });
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    try {
      let url = "/orders/stats"; 
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Eroare la preluarea statisticilor:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((startDate && !endDate) || (!startDate && endDate)) return; 
    fetchStats();
  }, [startDate, endDate]);

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
  };

  // Calcul Valoare Medie Comandă
  const averageOrderValue = stats.totalOrders > 0 ? (stats.totalRevenueCents / stats.totalOrders) : 0;

  // Custom Tooltip pentru grafic
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0b1020]/95 border border-indigo-500/30 p-4 rounded-xl shadow-xl backdrop-blur-xl">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
          <p className="text-indigo-400 font-bold italic">{formatRON(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <SEO title="Admin Dashboard | Karix" description="Panou de control statistici." />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent">
        <div className="max-w-6xl mx-auto relative z-10">
          
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2 italic uppercase">
              Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">Vânzări</span>
            </h1>
            <p className="text-gray-400 font-medium italic">Vizualizare performanță magazin, statusuri și raport încasări.</p>
          </header>

          {/* FILTRE DE TIMP */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-[30px] backdrop-blur-md mb-10 flex flex-col md:flex-row items-center gap-6 shadow-xl">
            <div className="flex flex-col w-full md:w-auto">
              <label className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-2">Data de început</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#0b1020] border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 transition-colors cursor-pointer" />
            </div>
            <div className="hidden md:block text-gray-500 text-2xl mt-4">→</div>
            <div className="flex flex-col w-full md:w-auto">
              <label className="text-[10px] text-pink-400 font-black uppercase tracking-widest mb-2">Data de sfârșit</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#0b1020] border border-white/10 text-white rounded-xl p-3 outline-none focus:border-pink-500 transition-colors cursor-pointer" />
            </div>
            <div className="w-full md:w-auto md:ml-auto mt-4 md:mt-6">
              <button onClick={handleReset} disabled={!startDate && !endDate} className="w-full md:w-auto px-6 py-3 rounded-xl bg-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-500/20 hover:text-rose-400 transition-all disabled:opacity-30">
                Resetare Filtre
              </button>
            </div>
          </div>

          {loading ? (
             <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div></div>
          ) : (
            <div className="flex flex-col gap-8">
              
              {/* TOP METRICS (3 CARDURI) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-900/40 to-[#0b1020] border border-indigo-500/30 p-8 rounded-[30px] shadow-2xl relative overflow-hidden">
                  <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Total Comenzi</p>
                  <div className="text-5xl font-black text-white tracking-tighter">{stats.totalOrders}</div>
                </div>

                <div className="bg-gradient-to-br from-pink-900/40 to-[#0b1020] border border-pink-500/30 p-8 rounded-[30px] shadow-2xl relative overflow-hidden">
                  <p className="text-pink-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Total Încasări</p>
                  <div className="text-4xl font-black text-white italic tracking-tighter drop-shadow-lg">{formatRON(stats.totalRevenueCents)}</div>
                </div>

                <div className="bg-gradient-to-br from-emerald-900/20 to-[#0b1020] border border-emerald-500/30 p-8 rounded-[30px] shadow-2xl relative overflow-hidden">
                  <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Media / Comandă (AOV)</p>
                  <div className="text-4xl font-black text-white italic tracking-tighter drop-shadow-lg">{formatRON(averageOrderValue)}</div>
                </div>
              </div>

              {/* MINI-CARDURI STATUS OPERAȚIONAL */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-[20px] text-center backdrop-blur-sm">
                  <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-1">În Procesare</p>
                  <p className="text-2xl font-black text-white">{stats.statusCounts?.inProcess || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-[20px] text-center backdrop-blur-sm">
                  <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Livrate</p>
                  <p className="text-2xl font-black text-white">{stats.statusCounts?.delivered || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-[20px] text-center backdrop-blur-sm">
                  <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest mb-1">Anulate</p>
                  <p className="text-2xl font-black text-white">{stats.statusCounts?.canceled || 0}</p>
                </div>
              </div>

              {/* ZONA DE GRAFIC ȘI TOP PRODUSE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* GRAFIC EVOLUȚIE ÎNCASĂRI (Ocupă 2/3 din spațiu) */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 p-6 md:p-8 rounded-[35px] backdrop-blur-md shadow-2xl">
                  <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-6">Evoluție Încasări</h3>
                  <div className="h-[300px] w-full">
                    {stats.chartData && stats.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis dataKey="date" stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#ffffff50" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 100} RON`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 italic text-sm">Nu există date suficiente pentru grafic în această perioadă.</div>
                    )}
                  </div>
                </div>

                {/* TOP 5 PRODUSE/SERVICII */}
                <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[35px] backdrop-blur-md shadow-2xl flex flex-col">
                  <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-6">Top 5 Bestsellers</h3>
                  
                  {stats.topProducts && stats.topProducts.length > 0 ? (
                    <div className="flex flex-col gap-4 flex-1">
                      {stats.topProducts.map((prod, index) => (
                        <div key={index} className="flex items-center gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${index === 0 ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' : index === 1 ? 'bg-gray-300 text-black' : index === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-gray-400'}`}>
                            #{index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold truncate leading-tight">{prod.name}</p>
                            <p className="text-gray-400 text-[10px] mt-0.5">{prod.count} {prod.count === 1 ? 'bucată' : 'bucăți'}</p>
                          </div>
                          <div className="text-indigo-400 text-xs font-black italic shrink-0">
                            {formatRON(prod.revenue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500 italic text-sm">Nu există vânzări.</div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}