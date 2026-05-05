import React, { useState, useEffect } from "react";
import { formatRON } from "../utils/money"; // Folosim funcția ta de formatare
import { apiFetch } from "../api/client"; // Funcția ta de fetch
import SEO from "../components/SEO";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenueCents: 0 });
  const [loading, setLoading] = useState(true);
  
  // State pentru perioada selectată (implicit lăsăm gol pentru "Toate timpurile")
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Funcția care aduce datele din backend
  const fetchStats = async () => {
    setLoading(true);
    try {
      // Construim URL-ul cu parametrii de date, dacă există
      let url = "/admin/stats"; // Modifică dacă ruta ta de backend este diferită (ex: /orders/stats)
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

  // Rulăm fetch-ul la încărcarea paginii și de fiecare dată când se schimbă datele selectate
  useEffect(() => {
    // Dacă utilizatorul a selectat doar o dată, așteptăm să o selecteze și pe a doua
    if ((startDate && !endDate) || (!startDate && endDate)) {
      return; 
    }
    fetchStats();
  }, [startDate, endDate]);

  // Funcție pentru resetarea datelor ("Toate timpurile")
  const handleReset = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <>
      <SEO title="Admin Dashboard | Karix" description="Panou de control statistici." />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent">
        <div className="max-w-5xl mx-auto relative z-10">
          
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2 italic uppercase">
              Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">Vânzări</span>
            </h1>
            <p className="text-gray-400 font-medium italic">Vizualizare performanță magazin și raport încasări.</p>
          </header>

          {/* SECTION: FILTRE DE TIMP */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-[30px] backdrop-blur-md mb-10 flex flex-col md:flex-row items-center gap-6 shadow-xl">
            <div className="flex flex-col w-full md:w-auto">
              <label className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-2">Data de început</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#0b1020] border border-white/10 text-white rounded-xl p-3 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              />
            </div>
            
            <div className="hidden md:block text-gray-500 text-2xl mt-4">→</div>
            
            <div className="flex flex-col w-full md:w-auto">
              <label className="text-[10px] text-pink-400 font-black uppercase tracking-widest mb-2">Data de sfârșit</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#0b1020] border border-white/10 text-white rounded-xl p-3 outline-none focus:border-pink-500 transition-colors cursor-pointer"
              />
            </div>

            <div className="w-full md:w-auto md:ml-auto mt-4 md:mt-6">
              <button 
                onClick={handleReset}
                disabled={!startDate && !endDate}
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-500/20 hover:text-rose-400 transition-all disabled:opacity-30"
              >
                Resetare (Toate timpurile)
              </button>
            </div>
          </div>

          {/* SECTION: STATISTICI (CARDURI) */}
          {loading ? (
             <div className="flex justify-center py-20">
               <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* CARD: TOTAL COMENZI */}
              <div className="bg-gradient-to-br from-indigo-900/40 to-[#0b1020] border border-indigo-500/30 p-8 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col justify-between h-48">
                <div className="absolute top-0 right-0 p-6 opacity-10 text-8xl">📦</div>
                <div>
                  <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-2">Total Comenzi</p>
                  <p className="text-gray-400 text-[10px] italic">
                    {startDate && endDate ? `În perioada ${startDate} - ${endDate}` : 'De la începutul magazinului'}
                  </p>
                </div>
                <div className="text-5xl md:text-7xl font-black text-white tracking-tighter">
                  {stats.totalOrders}
                </div>
              </div>

              {/* CARD: TOTAL ÎNCASĂRI */}
              <div className="bg-gradient-to-br from-pink-900/40 to-[#0b1020] border border-pink-500/30 p-8 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col justify-between h-48">
                <div className="absolute top-0 right-0 p-6 opacity-10 text-8xl">💰</div>
                <div>
                  <p className="text-pink-400 text-xs font-black uppercase tracking-[0.2em] mb-2">Total Încasări</p>
                  <p className="text-gray-400 text-[10px] italic">
                    {startDate && endDate ? `În perioada ${startDate} - ${endDate}` : 'De la începutul magazinului'}
                  </p>
                </div>
                <div className="text-4xl md:text-5xl font-black text-white italic tracking-tighter drop-shadow-lg">
                  {formatRON(stats.totalRevenueCents)}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </>
  );
}