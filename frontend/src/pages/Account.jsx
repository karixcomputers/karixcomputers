import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";
// Importăm apiFetch pentru a folosi URL-ul corect de pe server
import { apiFetch } from "../api/client";

const MenuLink = ({ to, icon, label, badge }) => (
  <Link 
    to={to} 
    className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all group backdrop-blur-sm"
  >
    <div className="flex items-center gap-4">
      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-sm font-bold text-gray-300 group-hover:text-white uppercase tracking-wider">{label}</span>
    </div>
    {badge > 0 && (
      <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-black px-2 py-1 rounded-lg border border-indigo-500/20 animate-in fade-in zoom-in duration-300">
        {badge}
      </span>
    )}
  </Link>
);

export default function Account() {
  const { user, logout, accessToken } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    ordersCount: user?.ordersCount || 0,
    wishlistCount: user?.wishlistCount || 0,
    ticketsCount: user?.ticketsCount || 0
  });

  const fetchFreshStats = async () => {
    if (!accessToken) return;
    
    try {
      // MODIFICARE: Folosim apiFetch cu ruta relativă "/auth/me"
      // apiFetch adaugă automat VITE_API_URL-ul corect și Token-ul de autorizare
      const response = await apiFetch("/auth/me");

      if (response.ok) {
        const data = await response.json();
        
        if (data.user) {
          setStats({
            ordersCount: data.user.ordersCount || 0,
            wishlistCount: data.user.wishlistCount || 0,
            ticketsCount: data.user.ticketsCount || 0
          });
        }
      }
    } catch (error) {
      console.error("❌ Eroare la sincronizarea datelor:", error);
    }
  };

  useEffect(() => {
    fetchFreshStats();
  }, [accessToken]); 

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-indigo-500/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-pink-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12">
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2 italic uppercase">
            Panou <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Control</span>
          </h1>
          <p className="text-gray-400 font-medium tracking-wide uppercase text-xs">
            Salut, {user?.name?.split(' ')[0] || "Pilot"}! Datele tale sunt actualizate.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-4 space-y-4">
            <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/10 backdrop-blur-md mb-6 transition-all hover:bg-white/[0.04]">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-pink-500 mx-auto mb-4 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-indigo-500/30 rotate-3">
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <h2 className="text-xl font-bold text-white text-center truncate px-2">{user?.name}</h2>
              <p className="text-[10px] text-gray-500 text-center uppercase tracking-[0.2em] mt-1 font-black">Karix Member</p>
            </div>

            <nav className="flex flex-col gap-3">
              <MenuLink to="/orders" icon="📦" label="Comenzile Mele" badge={stats.ordersCount} />
              <MenuLink to="/account/warranties" icon="🛠️" label="Garanții" />
              <MenuLink to="/tickets" icon="🔄" label="Tichete Suport" badge={stats.ticketsCount} />
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all mt-4 group backdrop-blur-sm"
              >
                <span className="text-xl group-hover:rotate-12 transition-transform">🚪</span>
                <span className="text-sm font-bold text-red-400 uppercase tracking-wider">Deconectare</span>
              </button>
            </nav>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="p-10 rounded-[40px] bg-white/[0.02] border border-white/10 backdrop-blur-md relative overflow-hidden transition-all hover:bg-white/[0.04]">
              <h3 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                <span className="h-1 w-8 bg-indigo-500 rounded-full"></span>
                Informații Cont
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                <div className="group">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 group-hover:text-indigo-400 transition-colors">Email</p>
                  <p className="text-white font-bold text-lg border-b border-white/5 pb-2 truncate">{user?.email}</p>
                </div>
                
                <div className="group">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 group-hover:text-pink-400 transition-colors">Telefon</p>
                  <p className="text-white font-bold text-lg border-b border-white/5 pb-2">{user?.phone || "—"}</p>
                </div>

                <div className="group">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Membru din</p>
                  <p className="text-white font-bold text-lg">
                    {user?.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
                      : "Recent"}
                  </p>
                </div>

                <div className="group">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Securitate</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user?.isEmailVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                      {user?.isEmailVerified ? "Email Verificat ✅" : "Neconfirmat ⚠️"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { val: stats.ordersCount, label: "Comenzi Totale", icon: "📦", color: "indigo" },
                { val: stats.wishlistCount, label: "Wishlist", icon: "❤️", color: "pink" },
                { val: stats.ticketsCount, label: "Tichete Suport", icon: "🛠️", color: "emerald" }
              ].map((stat, i) => (
                <div key={i} className="group p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute -right-4 -bottom-4 text-6xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">{stat.icon}</div>
                  <p className="text-4xl font-black text-white mb-1 tracking-tighter animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {stat.val || 0}
                  </p>
                  <p className={`text-[10px] font-bold text-${stat.color}-400 uppercase tracking-[0.2em]`}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div> 
  );
}