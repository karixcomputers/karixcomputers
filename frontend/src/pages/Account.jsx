import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

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

  // 👉 STATE NOU PENTRU DATELE DE AFILIAT
  const [affiliateData, setAffiliateData] = useState(null);

  // State-uri pentru editarea numărului de telefon
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const fetchFreshStats = async () => {
    if (!accessToken) return;
    
    try {
      const response = await apiFetch("/auth/me");
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setStats({
            ordersCount: data.user.ordersCount || 0,
            wishlistCount: data.user.wishlistCount || 0,
            ticketsCount: data.user.ticketsCount || 0
          });
          
          // 👉 Sincronizăm datele cuponului de afiliat dacă backend-ul le trimite în user.coupon
          if (data.user.coupon) {
            setAffiliateData(data.user.coupon);
          }
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

  const handleEditPhoneClick = () => {
    setNewPhone(user?.phone || "");
    setIsEditingPhone(true);
    setPhoneError("");
  };

  const handleSavePhone = async () => {
    if (!newPhone || newPhone.length < 9) {
      setPhoneError("Introdu un număr valid.");
      return;
    }
    
    setIsSavingPhone(true);
    setPhoneError("");

    try {
      const response = await apiFetch("/auth/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone })
      });

      if (response.ok) {
        setIsEditingPhone(false);
        window.location.reload(); 
      } else {
        const data = await response.json();
        setPhoneError(data.error || "Eroare la salvare.");
      }
    } catch (error) {
      setPhoneError("Eroare de conexiune.");
    } finally {
      setIsSavingPhone(false);
    }
  };

  return (
    <>
      <SEO 
        title={`Contul lui ${user?.name?.split(' ')[0] || "Pilot"}`}
        description="Gestionează-ți comenzile, garanțiile și tichetele de suport direct din panoul de control Karix Computers."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-indigo-500/10 to-transparent blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-pink-500/5 blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <header className="mb-12">
            <h1 className="text-5xl font-black text-white tracking-tighter mb-2 italic uppercase">
              Panou <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Control</span>
            </h1>
            <p className="text-gray-400 font-medium tracking-wide uppercase text-xs">
              Salut, {user?.name?.split(' ')[0] || "Pilot"}!
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Coloana Stângă: Profil și Navigare */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/10 backdrop-blur-md mb-6 transition-all hover:bg-white/[0.04]">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-pink-500 mx-auto mb-4 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-indigo-500/30 rotate-3">
                  {user?.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <h2 className="text-xl font-bold text-white text-center truncate px-2">{user?.name}</h2>
                <p className="text-[10px] text-gray-500 text-center uppercase tracking-[0.2em] mt-1 font-black">Karix Member</p>
              </div>

              <nav className="flex flex-col gap-3">
                <MenuLink to="/orders" icon="📦" label="Comenzile Mele"  />
                <MenuLink to="/account/warranties" icon="🛠️" label="Garanții" />
                <MenuLink to="/tickets" icon="🔄" label="Tichete Suport"  />
                
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all mt-4 group backdrop-blur-sm"
                >
                  <span className="text-xl group-hover:rotate-12 transition-transform">🚪</span>
                  <span className="text-sm font-bold text-red-400 uppercase tracking-wider">Deconectare</span>
                </button>
              </nav>
            </div>

            {/* Coloana Dreaptă: Date și Statistici */}
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
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-pink-400 transition-colors">Telefon</p>
                      {!isEditingPhone && (
                        <button onClick={handleEditPhoneClick} className="text-[9px] text-indigo-400 hover:text-white uppercase tracking-widest font-black transition-colors">
                          Modifică
                        </button>
                      )}
                    </div>

                    {isEditingPhone ? (
                      <div className="flex flex-col gap-2 mt-1 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex gap-2">
                          <input 
                            type="tel"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
                            placeholder="Ex: 0712345678"
                            disabled={isSavingPhone}
                          />
                          <button 
                            onClick={handleSavePhone} 
                            disabled={isSavingPhone}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {isSavingPhone ? "..." : "✓"}
                          </button>
                          <button 
                            onClick={() => setIsEditingPhone(false)} 
                            disabled={isSavingPhone}
                            className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </div>
                        {phoneError && <span className="text-[9px] text-pink-500 font-bold uppercase tracking-widest">{phoneError}</span>}
                      </div>
                    ) : (
                      <p className="text-white font-bold text-lg border-b border-white/5 pb-2">{user?.phone || "—"}</p>
                    )}
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

              {/* 👉 NOU: PANOU HUB AFILIERE (RANDARE CONDIȚIONATĂ) */}
              {affiliateData && (
                <div className="p-10 rounded-[40px] bg-gradient-to-br from-indigo-950/20 to-pink-950/10 border border-indigo-500/20 backdrop-blur-md relative overflow-hidden transition-all hover:border-indigo-500/40 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="absolute right-6 top-6 text-4xl opacity-10 select-none">💎</div>
                  
                  <h3 className="text-sm font-black text-pink-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <span className="h-1 w-8 bg-pink-500 rounded-full"></span>
                    Program Afiliere Karix
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Codul Tău</p>
                      <p className="text-xl font-black text-white tracking-wide bg-gradient-to-r from-indigo-400 to-pink-400 text-transparent bg-clip-text font-mono">
                        {affiliateData.code}
                      </p>
                    </div>
                    
                    <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Utilizări Cupon</p>
                      <p className="text-xl font-black text-white">{affiliateData.timesUsed || 0} comenzi</p>
                    </div>

                    <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Sold Disponibil</p>
                      <p className="text-xl font-black text-emerald-400">
                        {((affiliateData.earningsCents || 0) / 100).toFixed(2)} RON
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400 flex items-start gap-3">
                    <span className="text-base mt-0.5">ℹ️</span>
                    <div>
                      <p className="font-bold text-gray-300 mb-1">Cum îți retragi banii?</p>
                      Pentru a solicita plata comisioanelor acumulate, te rugăm să deschizi un <Link to="/tickets" className="text-indigo-400 hover:underline font-bold">Tichet de Suport</Link> sau să contactezi echipa de administrare prin canalele oficiale.
                    </div>
                  </div>
                </div>
              )}

              {/* Cards Statistici standard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { val: stats.ordersCount, label: "Comenzi Totale", icon: "📦", color: "indigo" },
                  { val: stats.wishlistCount, label: "Wishlist", icon: "❤️", color: "pink" },
                  { val: stats.ticketsCount, label: "Tichete Suport", icon: "🛠️", color: "emerald" }
                ].map((stat, i) => (
                  <div key={i} className={`group p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-${stat.color}-500/30 transition-all relative overflow-hidden backdrop-blur-sm`}>
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
    </>
  );
}