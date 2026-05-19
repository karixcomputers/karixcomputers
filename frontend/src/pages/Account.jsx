import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import SEO from "../components/SEO";

// Componenta de meniu actualizată pentru a suporta și evenimente de tip Tab/Click local
const MenuLink = ({ to, icon, label, badge, onClick, isActive }) => {
  const content = (
    <div className="flex items-center gap-4">
      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
    </div>
  );

  const classes = `w-full flex items-center justify-between p-4 rounded-2xl transition-all group backdrop-blur-sm text-left ${
    isActive 
      ? "bg-gradient-to-r from-indigo-500/20 to-pink-500/10 border-indigo-500 text-white font-black" 
      : "bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.05] hover:border-indigo-500/30"
  } border`;

  if (onClick) {
    return (
      <button onClick={onClick} className={classes}>
        {content}
        {badge > 0 && (
          <span className="bg-pink-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg border border-pink-400 animate-pulse">
            NEW
          </span>
        )}
      </button>
    );
  }

  return (
    <Link to={to} className={classes}>
      {content}
      {badge > 0 && (
        <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-black px-2 py-1 rounded-lg border border-indigo-500/20">
          {badge}
        </span>
      )}
    </Link>
  );
};

export default function Account() {
  const { user, logout, accessToken } = useAuth();
  const navigate = useNavigate();

  // Tab curent în panou: "general" sau "affiliate"
  const [activeTab, setActiveTab] = useState("general");

  const [stats, setStats] = useState({
    ordersCount: user?.ordersCount || 0,
    wishlistCount: user?.wishlistCount || 0,
    ticketsCount: user?.ticketsCount || 0
  });

  const [affiliateCoupon, setAffiliateCoupon] = useState(null);

  // State-uri pentru editarea numărului de telefon
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // State-uri pentru fluxul de acceptare termeni parteneriat
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);

  // State-uri pentru fluxul de retragere fonduri
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    type: "FIZICA", // "FIZICA" sau "JURIDICA"
    amount: "",
    fullName: "",
    identifier: "", // CNP sau CUI
    iban: "",
    bankName: ""
  });
  const [withdrawStatus, setWithdrawStatus] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    if (user && user.affiliate) {
      setAffiliateCoupon(user.affiliate);
    }
  }, [user]);

  const fetchFreshStats = async () => {
    if (!accessToken) return;
    
    try {
      const response = await apiFetch("/auth/me");
      if (response.ok) {
        const data = await response.json();
        const userData = data.user || data;

        if (userData) {
          setStats({
            ordersCount: userData._count?.orders ?? userData.ordersCount ?? 0,
            wishlistCount: userData._count?.wishlist ?? userData.wishlistCount ?? 0,
            ticketsCount: userData._count?.tickets ?? userData.ticketsCount ?? 0
          });

          if (userData.affiliate) {
            setAffiliateCoupon(userData.affiliate);
          } else {
            setAffiliateCoupon(null);
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

  const handleAcceptPartnership = async () => {
    if (!acceptedTerms) {
      setAcceptError("Trebuie să bifezi că ești de acord cu termenii programului.");
      return;
    }

    setIsAccepting(true);
    setAcceptError("");

    try {
      const response = await apiFetch("/coupons/accept", {
        method: "POST"
      });

      if (response.ok) {
        await fetchFreshStats();
      } else {
        const data = await response.json();
        setAcceptError(data.error || "Nu s-a putut activa parteneriatul.");
      }
    } catch (err) {
      setAcceptError("Eroare de comunicare cu serverul.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setWithdrawStatus({ loading: true, error: "", success: "" });

    // Validare de bază
    if (!withdrawForm.amount || parseFloat(withdrawForm.amount) < 100) {
      setWithdrawStatus({ loading: false, error: "Suma minimă este 100 RON.", success: "" });
      return;
    }
    if (!withdrawForm.fullName || !withdrawForm.identifier || !withdrawForm.iban) {
      setWithdrawStatus({ loading: false, error: "Completează toate câmpurile obligatorii.", success: "" });
      return;
    }

    try {
      const response = await apiFetch("/coupons/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(withdrawForm.amount),
          type: withdrawForm.type,
          fullName: withdrawForm.fullName,
          identifier: withdrawForm.identifier,
          iban: withdrawForm.iban,
          bankName: withdrawForm.bankName
        })
      });

      if (response.ok) {
        setWithdrawStatus({ loading: false, error: "", success: "Cererea de retragere a fost trimisă cu succes!" });
        // Închidem modalul și facem refresh la date după 2 secunde
        setTimeout(() => {
          setShowWithdrawModal(false);
          setWithdrawStatus({ loading: false, error: "", success: "" });
          fetchFreshStats();
        }, 2000);
      } else {
        const data = await response.json();
        setWithdrawStatus({ loading: false, error: data.error || "A apărut o eroare la înregistrarea cererii.", success: "" });
      }
    } catch (err) {
      setWithdrawStatus({ loading: false, error: "Eroare de comunicare cu serverul.", success: "" });
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setWithdrawForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <SEO 
        title={`Contul lui ${user?.name?.split(' ')[0] || "Pilot"}`}
        description="Gestionează-ți comenzile, garanțiile și tichetele de suport direct din panoul de control Karix Computers."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden">
        {/* Efecte vizuale fundal */}
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
                <MenuLink to="#" icon="👤" label="Informații Cont" onClick={() => setActiveTab("general")} isActive={activeTab === "general"} />
                <MenuLink to="/orders" icon="📦" label="Comenzile Mele" />
                <MenuLink to="/account/warranties" icon="🛠️" label="Garanții" />
                <MenuLink to="/tickets" icon="🔄" label="Tichete Suport" />
                
                <MenuLink 
                  to="#" 
                  icon="🚀" 
                  label="Program Afiliere" 
                  onClick={() => setActiveTab("affiliate")} 
                  isActive={activeTab === "affiliate"}
                  badge={affiliateCoupon?.status === "PENDING" ? 1 : 0}
                />
                
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all mt-4 group backdrop-blur-sm text-left"
                >
                  <span className="text-xl group-hover:rotate-12 transition-transform">🚪</span>
                  <span className="text-sm font-bold text-red-400 uppercase tracking-wider">Deconectare</span>
                </button>
              </nav>
            </div>

            {/* Coloana Dreaptă: Conținut Dinamic */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* === TAB 1: INFORMAȚII CONT (GENERAL) === */}
              {activeTab === "general" && (
                <div className="space-y-8 animate-in fade-in duration-300">
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

                  {/* Cards Statistici */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { val: stats.ordersCount, label: "Comenzi Totale", icon: "📦" },
                      { val: stats.wishlistCount, label: "Wishlist", icon: "❤️" },
                      { val: stats.ticketsCount, label: "Tichete Suport", icon: "🛠️" }
                    ].map((stat, i) => (
                      <div key={i} className="group p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all relative overflow-hidden backdrop-blur-sm">
                        <div className="absolute -right-4 -bottom-4 text-6xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">{stat.icon}</div>
                        <p className="text-4xl font-black text-white mb-1 tracking-tighter">
                          {stat.val || 0}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === TAB 2: PROGRAM AFILIERE === */}
              {activeTab === "affiliate" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  
                  {(() => {
                    const coupon = Array.isArray(affiliateCoupon) 
                    
                      ? (affiliateCoupon.length > 0 ? affiliateCoupon[0] : null) 
                      : affiliateCoupon;
                    console.log("DEBUG: Obiectul coupon primit:", coupon);
console.log("DEBUG: totalDiscounted:", coupon?.totalDiscounted);
                    if (!coupon) {
                      return (
                        <div className="p-8 rounded-[40px] bg-white/[0.01] border border-white/5 backdrop-blur-md relative overflow-hidden">
                          <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                            <span className="h-1 w-8 bg-gray-600 rounded-full"></span>
                            Program Afiliere Karix
                          </h3>
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div>
                              <p className="text-white font-bold text-base mb-1">Nu ai un cod de afiliat activ</p>
                              <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
                                Vrei să câștigi comisioane și să oferi reduceri comunității tale pe live-uri sau clipuri? Contactează-ne pentru a solicita verificarea canalelor tale sociale.
                              </p>
                            </div>
                            <Link to="/contact" className="px-5 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-black text-[11px] uppercase tracking-wider rounded-xl border border-indigo-500/20 hover:border-indigo-500/40 transition-all text-center whitespace-nowrap">
                              Contactează-ne ➜
                            </Link>
                          </div>
                        </div>
                      );
                    }

const currentStatus = coupon.status?.toUpperCase();

if (currentStatus === "ACTIVE") {
  // ✅ REPARAT: Backend-ul trimite 'earnings' direct ca valoare calculată (ex: 1322.28)
  // Punem și o verificare de siguranță în caz că pe viitor revii la varianta cu totalDiscounted
  let earningsRON = "0.00";

  if (coupon?.earnings !== undefined) {
    // Dacă primim direct 'earnings' (cum e acum în Network: 1322.28)
    earningsRON = Number(coupon.earnings).toFixed(2);
  } else {
    // Fallback în caz că pe viitor vine sub formă de cenți în totalDiscounted
    const totalCents = coupon?.totalDiscounted || 0;
    earningsRON = (totalCents / 100).toFixed(2);
  }

  const isEligibleForWithdrawal = parseFloat(earningsRON) >= 100;

  return (
    <div className="p-8 rounded-[40px] bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 border border-indigo-500/20 backdrop-blur-md relative overflow-hidden transition-all hover:border-indigo-500/40 shadow-2xl">
      <h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
        <span className="h-1 w-8 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"></span>
        Statistici Partener Karix
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Codul Tău</span>
          <span className="text-2xl font-black italic text-indigo-400 uppercase tracking-wider select-all cursor-pointer">{coupon.code}</span>
        </div>
        <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Utilizări</span>
          <span className="text-2xl font-black text-white">{coupon.timesUsed || 0}</span>
        </div>
        <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Reduceri Generate</span>
          <span className="text-2xl font-black text-emerald-400">{earningsRON} RON</span>
        </div>
      </div>

                          {/* ZONA DE RETRAGERE (NOU) */}
                          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                              <p className="text-[11px] text-gray-400 uppercase tracking-widest font-bold">Prag minim retragere: 100 RON</p>
                              {!isEligibleForWithdrawal && (
                                <p className="text-[10px] text-pink-400 font-bold uppercase mt-1">
                                  Mai ai nevoie de {(100 - parseFloat(earningsRON)).toFixed(2)} RON
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setWithdrawForm(prev => ({ ...prev, amount: earningsRON }));
                                setShowWithdrawModal(true);
                              }}
                              disabled={!isEligibleForWithdrawal}
                              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/20"
                            >
                              Solicită Retragerea
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // CAZ 2: INVITAȚIE ÎN AȘTEPTARE (PENDING)
                    if (currentStatus === "PENDING" || !coupon.isActive) {
                      return (
                        <div className="p-10 rounded-[40px] bg-gradient-to-b from-indigo-500/10 to-pink-500/5 border border-indigo-500/30 backdrop-blur-xl relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                          <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2 italic">
                            🚀 Invitație Parteneriat Pre-Aprobată!
                          </h3>
                          <p className="text-xs text-gray-400 mb-8 leading-relaxed">
                            Felicitări! Ai fost selectat pentru a deveni partener oficial al brandului **Karix Computers**. Comunitatea ta va primi un cod de **1% reducere** la orice comandă pe site.
                          </p>
                          <div className="bg-black/30 border border-white/5 rounded-3xl p-6 mb-8 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Codul rezervat:</span>
                              <span className="text-sm font-black text-pink-400 bg-pink-500/10 px-3 py-1 rounded-xl border border-pink-500/20">{coupon.code || "FĂRĂ_COD"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Acord Oficial:</span>
                              <button onClick={() => setShowTermsModal(true)} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 underline uppercase tracking-wider">
                                Citește Termenii și Condițiile ➜
                              </button>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 mb-6 select-none">
                            <input type="checkbox" id="termsCheck" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-white/10 bg-black/40 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                            <label htmlFor="termsCheck" className="text-xs text-gray-300 cursor-pointer leading-tight font-medium">
                              Confirm că am citit și sunt de acord cu termenii de afiliere Karix.
                            </label>
                          </div>
                          {acceptError && <p className="text-xs text-pink-500 font-bold uppercase tracking-wide mb-4">⚠️ {acceptError}</p>}
                          <button onClick={handleAcceptPartnership} disabled={isAccepting} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl disabled:opacity-50">
                            {isAccepting ? "Se activează contul..." : "Activează Contul de Partener 🚀"}
                          </button>
                        </div>
                      );
                    }

                    return <p className="text-xs text-gray-500">Stare parteneriat nedefinită. Contactează suportul.</p>;
                  })()}

                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL CITIRE TERMENI ȘI CONDIȚII ================= */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[32px] p-8 max-h-[80vh] flex flex-col relative overflow-hidden shadow-2xl">
            <header className="mb-6 flex justify-between items-center border-b border-white/5 pb-4">
              <h4 className="text-lg font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                Termeni și Condiții Afiliere
              </h4>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-black flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </header>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-gray-400 leading-relaxed font-medium custom-scrollbar">
              <p className="text-white font-bold text-sm">1. Dispoziții Generale</p>
              <p>Prezentul acord stabilește termenii legali pentru participarea în programul de promovare și afiliere Karix Computers. Prin activarea codului, deveniți un partener/promotor independent și nu un angajat legal sau reprezentant oficial al brandului.</p>
              
              <p className="text-white font-bold text-sm">2. Generarea și Utilizarea Codului</p>
              <p>Codul atribuit oferă o reducere fixă de 1% cumpărătorilor la finalizarea comenzilor pe site-ul oficial. Este strict interzisă publicarea codului pe site-uri de vouchere generice (agregatoare de cupoane). Codul este destinat exclusiv comunității dumneavoastră și canalelor media proprii (TikTok Live, YouTube, Discord, Instagram etc.). Încălcarea acestei reguli atrage anularea comisioanelor acumulate.</p>
              
              <p className="text-white font-bold text-sm">3. Calculul, Reținerea Taxelor și Plata Comisioanelor</p>
              <p>Comisioanele se acumulează în sistem în timp real. Sumele generate devin eligibile pentru retragere doar după confirmarea plății comenzilor de către clienți și trecerea perioadei legale de retur de 14 zile pentru produsele respective.</p>
              <p>**Pragul minim de retragere** a comisioanelor este de **100 RON**.</p>
              <p>Modalitățile de plată se realizează diferențiat, în funcție de forma juridică a Partenerului, conform legislației fiscale din România:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Persoane Juridice (PFA/SRL):</strong> Plata se face integral (Suma Brută), în baza unei facturi fiscale emise de Partener.</li>
                <li><strong>Persoane Fizice (Fără Firmă):</strong> Veniturile sunt încadrate ca drepturi de autor sau convenții civile. Karix Computers va calcula, va reține la sursă și va vira către ANAF impozitul pe venit de 10% datorat de Partener. Plata efectivă în contul bancar al Partenerului se va face sub formă de <strong>Sumă Netă</strong> (Suma Brută minus impozitul de 10%).</li>
              </ul>

              <p className="text-white font-bold text-sm">4. Date Obligatorii pentru Plată (Persoane Fizice)</p>
              <p>Pentru a putea efectua plata legală și declararea taxelor la ANAF (prin Declarația 112), Partenerii persoane fizice au obligația de a furniza la prima retragere: Numele complet (conform CI), CNP-ul și contul IBAN personal. Datele sunt colectate exclusiv în scop fiscal și contabil.</p>

              <p className="text-white font-bold text-sm">5. Conduită și Imagine Publică</p>
              <p>Partenerul se obligă să mențină o imagine publică decentă în timpul promovării brandului. Sunt strict interzise promovarea codului în contexte de fraudă, dezinformare, comportament toxic sau defăimarea directă a brandului Karix Computers ori a serviciilor noastre tehnice.</p>

              <p className="text-white font-bold text-sm">6. Durata și Încetarea Contractului</p>
              <p>Prezentul acord intră în vigoare la data acceptării lui electronice și este încheiat pe durată nedeterminată. **Oricare dintre părți (Karix Computers sau Partenerul) poate denunța unilateral și încheia acest parteneriat în orice moment**, fără preaviz și fără obligația de a justifica decizia. În cazul încetării, comisioanele corect acumulate și validate până la momentul rezilierii care depășesc pragul minim vor fi achitate Partenerului.</p>
            </div>

            <footer className="mt-6 pt-4 border-top border-white/5 flex justify-end">
              <button
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                }}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors"
              >
                Am citit și Accept termenii
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ================= MODAL FORMULAR RETRAGERE (NOU) ================= */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0b0c10] border border-white/10 rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
            <header className="mb-6 border-b border-white/5 pb-4 flex justify-between items-start">
              <div>
                <h4 className="text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  💰 Solicitare Retragere
                </h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Transfer Bancar direct</p>
              </div>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-black flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </header>

            {withdrawStatus.success ? (
              <div className="py-10 text-center animate-in zoom-in-95">
                <div className="text-5xl mb-4">✅</div>
                <h5 className="text-lg font-black text-white uppercase tracking-wider mb-2">Cerere Înregistrată!</h5>
                <p className="text-xs text-gray-400">{withdrawStatus.success}</p>
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-5">
                
                {/* Suma de retras */}
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Sumă de retras (RON)</label>
                  <input 
                    type="number"
                    name="amount"
                    value={withdrawForm.amount}
                    onChange={handleFormChange}
                    min="100"
                    step="0.01"
                    className="w-full bg-transparent text-2xl font-black text-white outline-none"
                    required
                  />
                </div>

                {/* Tip Entitate */}
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Tip Profil Fiscal</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${withdrawForm.type === "FIZICA" ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'}`}>
                      <input type="radio" name="type" value="FIZICA" checked={withdrawForm.type === "FIZICA"} onChange={handleFormChange} className="hidden" />
                      <span className="text-xs font-bold uppercase tracking-wider">Pers. Fizică</span>
                    </label>
                    <label className={`flex-1 p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${withdrawForm.type === "JURIDICA" ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'}`}>
                      <input type="radio" name="type" value="JURIDICA" checked={withdrawForm.type === "JURIDICA"} onChange={handleFormChange} className="hidden" />
                      <span className="text-xs font-bold uppercase tracking-wider">PFA / SRL</span>
                    </label>
                  </div>
                </div>

                {/* Date Personale / Firmă */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                      {withdrawForm.type === "FIZICA" ? "Nume Complet (din CI)" : "Nume Firmă (PFA/SRL)"}
                    </label>
                    <input 
                      type="text"
                      name="fullName"
                      value={withdrawForm.fullName}
                      onChange={handleFormChange}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                      {withdrawForm.type === "FIZICA" ? "CNP" : "CUI / CIF"}
                    </label>
                    <input 
                      type="text"
                      name="identifier"
                      value={withdrawForm.identifier}
                      onChange={handleFormChange}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Date Bancare */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Cont IBAN</label>
                    <input 
                      type="text"
                      name="iban"
                      value={withdrawForm.iban}
                      onChange={handleFormChange}
                      placeholder="RO..."
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-indigo-500 transition-colors font-mono uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Nume Bancă (Opțional)</label>
                    <input 
                      type="text"
                      name="bankName"
                      value={withdrawForm.bankName}
                      onChange={handleFormChange}
                      placeholder="Ex: Banca Transilvania"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Mesaje de eroare */}
                {withdrawStatus.error && (
                  <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-3">
                    <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest text-center">⚠️ {withdrawStatus.error}</p>
                  </div>
                )}

                {/* Buton Submit */}
                <button 
                  type="submit"
                  disabled={withdrawStatus.loading}
                  className="w-full py-4 mt-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl disabled:opacity-50"
                >
                  {withdrawStatus.loading ? "Se procesează..." : "Trimite Cererea"}
                </button>
                
                {/* Info Text pentru Persoane Fizice */}
                {withdrawForm.type === "FIZICA" && (
                  <p className="text-[9px] text-gray-500 text-center leading-relaxed px-4">
                    *În calitate de persoană fizică, Karix Computers va reține la sursă impozitul pe venit (10%) și îl va declara la ANAF în numele tău. Suma încasată efectiv în cont va fi valoarea NETĂ.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  ); 
}